import { activityService } from "@/lib/activity.service";
import { supabase } from "@/lib/supabase";
import { getCurrentUserId, normalizeFragility, resolveUniqueName } from "@/lib/utils/service-utils";

type ItemRow = {
  id: string;
  name: string | null;
  notes: string | null;
  quantity: number | null;
  is_fragile: boolean | null;
  photo_url: string | null;
  box_id: string;
  created_at: string | null;
  updated_at: string | null;
};

type BoxContextRow = {
  id: string;
  name: string;
  room_id: string | null;
  fragility: string | null;
  room:
    | {
        id: string;
        name: string;
        location_id: string;
        location: { id: string; name: string } | Array<{ id: string; name: string }> | null;
      }
    | Array<{
        id: string;
        name: string;
        location_id: string;
        location: { id: string; name: string } | Array<{ id: string; name: string }> | null;
      }>
    | null;
};

type BoxSearchContext = {
  name: string | null;
  rooms: RoomSearchContext | RoomSearchContext[] | null;
};

type RoomSearchContext = {
  name: string | null;
  locations: LocationSearchContext | LocationSearchContext[] | null;
};

type LocationSearchContext = {
  name: string | null;
};

type ItemSearchRow = {
  id: string;
  name: string | null;
  quantity: number | null;
  is_fragile: boolean | null;
  box_id: string | null;
  boxes: BoxSearchContext | BoxSearchContext[] | null;
};

export type ItemSearchResult = {
  id: string;
  name: string;
  quantity: number;
  isFragile: boolean;
  boxId: string;
  boxName: string;
  roomName: string;
  locationName: string;
};

export type ItemSummary = {
  id: string;
  name: string;
  notes: string | null;
  quantity: number;
  isFragile: boolean;
  photoUrl: string | null;
  boxId: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type CreateItemInput = {
  name: string;
  quantity: number;
  isFragile?: boolean;
  notes?: string | null;
  boxId: string;
};

export type UpdateItemInput = {
  name: string;
  quantity: number;
  isFragile?: boolean;
  notes?: string | null;
  boxId: string;
};

function normalizeName(name: string): string {
  const normalizedName = name.trim();
  if (!normalizedName) {
    throw new Error("Item name is required.");
  }

  return normalizedName;
}

function normalizeNotes(notes: string | null | undefined): string | null {
  if (typeof notes !== "string") {
    return null;
  }

  const normalizedNotes = notes.trim();
  return normalizedNotes.length > 0 ? normalizedNotes : null;
}

function normalizeQuantity(quantity: number): number {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error("Quantity must be a whole number greater than 0.");
  }

  return quantity;
}

function normalizeItemFragility(isFragile: boolean | undefined): boolean {
  return isFragile === true;
}

function normalizeBoxId(boxId: string): string {
  const normalizedBoxId = boxId.trim();
  if (!normalizedBoxId) {
    throw new Error("Box is required.");
  }

  return normalizedBoxId;
}

function mapItem(item: ItemRow): ItemSummary {
  return {
    id: item.id,
    name: item.name?.trim() || "Unnamed item",
    notes: item.notes,
    quantity: typeof item.quantity === "number" && item.quantity > 0 ? item.quantity : 1,
    isFragile: item.is_fragile === true,
    photoUrl: item.photo_url ?? null,
    boxId: item.box_id,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

async function assertUserOwnsBox(boxId: string, userId: string): Promise<BoxContextRow> {
  const { data, error } = await supabase
    .from("boxes")
    .select("id,name,room_id,fragility,room:rooms(id,name,location_id,location:locations(id,name))")
    .eq("id", boxId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error("Box not found.");
  }

  return data;
}

function getNormalizedRoomLocation(
  box: BoxContextRow,
): { roomId: string; roomName: string; locationId: string | null; locationName: string } {
  const room = Array.isArray(box.room) ? box.room[0] : box.room;
  const location = room && room.location ? (Array.isArray(room.location) ? room.location[0] : room.location) : null;

  if (!room) {
    return {
      roomId: box.room_id ?? "",
      roomName: "Unknown room",
      locationId: null,
      locationName: "Unknown location",
    };
  }

  return {
    roomId: room.id,
    roomName: room.name,
    locationId: location?.id ?? room.location_id ?? null,
    locationName: location?.name ?? "Unknown location",
  };
}

async function getRoomNameByRoomId(roomId: string | null, userId: string): Promise<string> {
  if (!roomId) {
    return "Unknown room";
  }

  const { data, error } = await supabase
    .from("rooms")
    .select("name")
    .eq("id", roomId)
    .maybeSingle();

  if (error) throw error;

  return data?.name ?? "Unknown room";
}

async function getBoxActivityContext(
  boxId: string,
  userId: string,
): Promise<{
  id: string;
  name: string;
  roomId: string;
  roomName: string;
  locationId: string | null;
  locationName: string;
  fragility: string | null;
}> {
  const box = await assertUserOwnsBox(boxId, userId);
  const normalizedContext = getNormalizedRoomLocation(box);
  const roomName =
    normalizedContext.roomName !== "Unknown room"
      ? normalizedContext.roomName
      : await getRoomNameByRoomId(box.room_id, userId);

  return {
    id: box.id,
    name: box.name,
    roomId: normalizedContext.roomId,
    roomName,
    locationId: normalizedContext.locationId,
    locationName: normalizedContext.locationName,
    fragility: box.fragility,
  };
}

async function markBoxFragileIfNeeded(boxContext: { id: string; fragility: string | null }, userId: string): Promise<void> {
  if (normalizeFragility(boxContext.fragility)) {
    return;
  }

  const { error } = await supabase
    .from("boxes")
    .update({ fragility: "fragile" })
    .eq("id", boxContext.id);

  if (error) throw error;
}

async function listItemsByBox(boxId: string): Promise<ItemSummary[]> {
  const normalizedBoxId = normalizeBoxId(boxId);
  const userId = await getCurrentUserId();

  await assertUserOwnsBox(normalizedBoxId, userId);

  const { data, error } = await supabase
    .from("items")
    .select("id,name,notes,quantity,is_fragile,photo_url,box_id,created_at,updated_at")
    .eq("box_id", normalizedBoxId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((item: ItemRow) => mapItem(item));
}

async function createItem(input: CreateItemInput): Promise<string> {
  const name = normalizeName(input.name);
  const quantity = normalizeQuantity(input.quantity);
  const isFragile = normalizeItemFragility(input.isFragile);
  const notes = normalizeNotes(input.notes);
  const boxId = normalizeBoxId(input.boxId);
  const userId = await getCurrentUserId();

  const targetBox = await getBoxActivityContext(boxId, userId);

  const { data: siblingData } = await supabase
    .from("items")
    .select("name")
    .eq("box_id", boxId)
    .ilike("name", `${name}%`);

  const siblingNames = (siblingData ?? [])
    .map((row: { name: string | null }) => row.name ?? "")
    .filter((n) => {
      const lower = n.toLowerCase();
      const base = name.toLowerCase();
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return lower === base || new RegExp(`^${escaped} #\\d+$`, "i").test(n);
    });

  const resolvedName = resolveUniqueName(name, siblingNames);

  const { data, error } = await supabase
    .from("items")
    .insert({
      user_id: userId,
      box_id: boxId,
      name: resolvedName,
      quantity,
      is_fragile: isFragile,
      notes,
    })
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data?.id) {
    throw new Error("Failed to create item.");
  }

  if (isFragile) {
    await markBoxFragileIfNeeded(targetBox, userId);
  }

  await activityService.writeActivitySafely({
    type: "Created",
    entityType: "item",
    entityId: data.id,
    title: "Item created",
    description: `Added item "${resolvedName}" to "${targetBox.name}".`,
    locationName: targetBox.locationName,
    roomName: targetBox.roomName,
    boxName: targetBox.name,
    next: {
      name: resolvedName,
      quantity,
      isFragile,
      notes,
      boxId: targetBox.id,
      boxName: targetBox.name,
      roomName: targetBox.roomName,
      roomId: targetBox.roomId,
      locationId: targetBox.locationId,
      locationName: targetBox.locationName,
    },
  });

  return data.id;
}

async function updateItem(itemId: string, input: UpdateItemInput): Promise<void> {
  const normalizedItemId = itemId.trim();
  const name = normalizeName(input.name);
  const quantity = normalizeQuantity(input.quantity);
  const isFragile = normalizeItemFragility(input.isFragile);
  const notes = normalizeNotes(input.notes);
  const boxId = normalizeBoxId(input.boxId);

  if (!normalizedItemId) {
    throw new Error("Item id is required.");
  }

  const userId = await getCurrentUserId();
  const { data: itemBeforeUpdate, error: itemBeforeUpdateError } = await supabase
    .from("items")
    .select("id,name,notes,quantity,is_fragile,box_id")
    .eq("id", normalizedItemId)
    .maybeSingle();

  if (itemBeforeUpdateError) throw itemBeforeUpdateError;
  if (!itemBeforeUpdate) {
    throw new Error("Item not found.");
  }

  const targetBox = await getBoxActivityContext(boxId, userId);
  const previousBox =
    itemBeforeUpdate.box_id === boxId
      ? targetBox
      : await getBoxActivityContext(itemBeforeUpdate.box_id, userId);

  const { data, error } = await supabase
    .from("items")
    .update({
      name,
      quantity,
      is_fragile: isFragile,
      notes,
      box_id: boxId,
    })
    .eq("id", normalizedItemId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error("Item not found.");
  }

  const previousName = itemBeforeUpdate.name?.trim() || "Unnamed item";
  const previousQuantity =
    typeof itemBeforeUpdate.quantity === "number" && itemBeforeUpdate.quantity > 0
      ? itemBeforeUpdate.quantity
      : 1;
  const previousIsFragile = itemBeforeUpdate.is_fragile === true;
  const previousNotes = itemBeforeUpdate.notes?.trim() || null;
  const hasNameChanged = previousName !== name;
  const hasQuantityChanged = previousQuantity !== quantity;
  const hasFragilityChanged = previousIsFragile !== isFragile;
  const hasNotesChanged = previousNotes !== notes;
  const hasBoxChanged = itemBeforeUpdate.box_id !== boxId;
  const hasAnyChange =
    hasNameChanged || hasQuantityChanged || hasFragilityChanged || hasNotesChanged || hasBoxChanged;

  if (!hasAnyChange) {
    if (isFragile) {
      await markBoxFragileIfNeeded(targetBox, userId);
    }

    return;
  }

  if (isFragile) {
    await markBoxFragileIfNeeded(targetBox, userId);
  }

  if (hasBoxChanged) {
    await activityService.writeActivitySafely({
      type: "Moved",
      entityType: "item",
      entityId: normalizedItemId,
      title: "Item moved",
      description: `Moved item "${name}" from "${previousBox.name}" to "${targetBox.name}".`,
      locationName: targetBox.locationName,
      roomName: targetBox.roomName,
      boxName: targetBox.name,
      previous: {
        boxId: previousBox.id,
        boxName: previousBox.name,
        roomName: previousBox.roomName,
        roomId: previousBox.roomId,
        locationId: previousBox.locationId,
        locationName: previousBox.locationName,
      },
      next: {
        boxId: targetBox.id,
        boxName: targetBox.name,
        roomName: targetBox.roomName,
        roomId: targetBox.roomId,
        locationId: targetBox.locationId,
        locationName: targetBox.locationName,
        isFragile,
      },
    });
    return;
  }

  const changeDetails: string[] = [];
  if (hasNameChanged) {
    changeDetails.push(`renamed from "${previousName}"`);
  }
  if (hasQuantityChanged) {
    changeDetails.push(`quantity changed to ${quantity}`);
  }
  if (hasFragilityChanged) {
    changeDetails.push(isFragile ? "marked as fragile" : "marked as not fragile");
  }
  if (hasNotesChanged) {
    changeDetails.push(notes ? "notes updated" : "notes cleared");
  }

  await activityService.writeActivitySafely({
    type: "Updated",
    entityType: "item",
    entityId: normalizedItemId,
    title: "Item updated",
    description:
      changeDetails.length > 0
        ? `Updated item "${name}": ${changeDetails.join(", ")}.`
        : `Updated item "${name}".`,
    locationName: targetBox.locationName,
    roomName: targetBox.roomName,
    boxName: targetBox.name,
    previous: {
      name: previousName,
      quantity: previousQuantity,
      isFragile: previousIsFragile,
      notes: previousNotes,
    },
    next: {
      name,
      quantity,
      isFragile,
      notes,
    },
  });
}

async function deleteItem(itemId: string): Promise<void> {
  const normalizedItemId = itemId.trim();
  if (!normalizedItemId) {
    throw new Error("Item id is required.");
  }

  const userId = await getCurrentUserId();
  const { data: itemBeforeDelete, error: itemBeforeDeleteError } = await supabase
    .from("items")
    .select("id,name,notes,quantity,is_fragile,box_id")
    .eq("id", normalizedItemId)
    .maybeSingle();

  if (itemBeforeDeleteError) throw itemBeforeDeleteError;
  if (!itemBeforeDelete) {
    throw new Error("Item not found.");
  }

  const boxContext = await getBoxActivityContext(itemBeforeDelete.box_id, userId);

  const itemName = itemBeforeDelete.name?.trim() || "Unnamed item";
  const quantity =
    typeof itemBeforeDelete.quantity === "number" && itemBeforeDelete.quantity > 0
      ? itemBeforeDelete.quantity
      : 1;

  await activityService.writeActivitySafely({
    type: "Deleted",
    entityType: "item",
    entityId: itemBeforeDelete.id,
    title: "Item deleted",
    description: `Deleted item "${itemName}" from "${boxContext.name}".`,
    locationName: boxContext.locationName,
    roomName: boxContext.roomName,
    boxName: boxContext.name,
    previous: {
      name: itemName,
      quantity,
      isFragile: itemBeforeDelete.is_fragile === true,
      notes: itemBeforeDelete.notes?.trim() || null,
      boxId: boxContext.id,
      boxName: boxContext.name,
      roomName: boxContext.roomName,
      roomId: boxContext.roomId,
      locationId: boxContext.locationId,
      locationName: boxContext.locationName,
    },
  });

  const { data, error } = await supabase
    .from("items")
    .delete()
    .eq("id", normalizedItemId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error("Item not found.");
  }
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

async function uploadItemPhoto(itemId: string, base64: string): Promise<void> {
  const userId = await getCurrentUserId();
  const path = `${userId}/${itemId}.jpg`;

  const arrayBuffer = base64ToArrayBuffer(base64);

  const { error: uploadError } = await supabase.storage
    .from("item-images")
    .upload(path, arrayBuffer, { contentType: "image/jpeg", upsert: true });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from("item-images").getPublicUrl(path);

  const { error: updateError } = await supabase
    .from("items")
    .update({ photo_url: urlData.publicUrl })
    .eq("id", itemId);

  if (updateError) throw updateError;
}

async function searchItems(query: string): Promise<ItemSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const { data, error } = await supabase
    .from("items")
    .select("id,name,quantity,is_fragile,box_id,boxes(name,rooms(name,locations(name)))")
    .ilike("name", `%${trimmed}%`)
    .not("box_id", "is", null)
    .limit(20);

  if (error) throw error;

  return (data ?? []).map((row: ItemSearchRow) => {
    const box = Array.isArray(row.boxes) ? row.boxes[0] : row.boxes;
    const room = box ? (Array.isArray(box.rooms) ? box.rooms[0] : box.rooms) : null;
    const location = room ? (Array.isArray(room.locations) ? room.locations[0] : room.locations) : null;

    return {
      id: row.id,
      name: row.name?.trim() || "Unnamed item",
      quantity: typeof row.quantity === "number" && row.quantity > 0 ? row.quantity : 1,
      isFragile: row.is_fragile === true,
      boxId: row.box_id ?? "",
      boxName: box?.name?.trim() || "Unknown box",
      roomName: room?.name?.trim() || "Unknown room",
      locationName: location?.name?.trim() || "Unknown location",
    };
  });
}

async function removeItemPhoto(itemId: string): Promise<void> {
  const userId = await getCurrentUserId();
  const path = `${userId}/${itemId}.jpg`;

  await supabase.storage.from("item-images").remove([path]);

  const { error } = await supabase
    .from("items")
    .update({ photo_url: null })
    .eq("id", itemId);

  if (error) throw error;
}

async function markItemUnpacked(itemId: string): Promise<void> {
  const normalizedItemId = itemId.trim();
  if (!normalizedItemId) {
    throw new Error("Item id is required.");
  }

  const userId = await getCurrentUserId();

  const { data: item, error: itemError } = await supabase
    .from("items")
    .select("id,name,box_id")
    .eq("id", normalizedItemId)
    .maybeSingle();

  if (itemError) throw itemError;
  if (!item) throw new Error("Item not found.");

  const { error } = await supabase
    .from("items")
    .update({ unpacked_at: new Date().toISOString() })
    .eq("id", normalizedItemId);

  if (error) throw error;

  if (item.box_id) {
    const boxContext = await getBoxActivityContext(item.box_id, userId);
    const itemName = item.name?.trim() || "Unnamed item";
    await activityService.writeActivitySafely({
      type: "Updated",
      entityType: "item",
      entityId: normalizedItemId,
      title: "Item unpacked",
      description: `Unpacked item "${itemName}" from "${boxContext.name}".`,
      locationName: boxContext.locationName,
      roomName: boxContext.roomName,
      boxName: boxContext.name,
      next: { unpacked: true },
    });
  }
}

export const itemService = {
  listItemsByBox,
  searchItems,
  createItem,
  updateItem,
  deleteItem,
  uploadItemPhoto,
  removeItemPhoto,
  markItemUnpacked,
};
