import { activityService } from "@/lib/activity.service";
import { supabase } from "@/lib/supabase";

type ItemRow = {
  id: string;
  name: string | null;
  notes: string | null;
  quantity: number | null;
  box_id: string;
  created_at: string | null;
  updated_at: string | null;
};

type BoxContextRow = {
  id: string;
  name: string;
  location_id: string | null;
};

export type ItemSummary = {
  id: string;
  name: string;
  notes: string | null;
  quantity: number;
  boxId: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type CreateItemInput = {
  name: string;
  quantity: number;
  notes?: string | null;
  boxId: string;
};

export type UpdateItemInput = {
  name: string;
  quantity: number;
  notes?: string | null;
  boxId: string;
};

async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;

  const userId = data.user?.id;
  if (!userId) {
    throw new Error("No authenticated user found.");
  }

  return userId;
}

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
    boxId: item.box_id,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

async function assertUserOwnsBox(boxId: string, userId: string): Promise<BoxContextRow> {
  const { data, error } = await supabase
    .from("boxes")
    .select("id,name,location_id")
    .eq("id", boxId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error("Box not found.");
  }

  return data;
}

async function getRoomNameByLocationId(locationId: string | null, userId: string): Promise<string> {
  if (!locationId) {
    return "Unknown room";
  }

  const { data, error } = await supabase
    .from("locations")
    .select("name")
    .eq("id", locationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  return data?.name ?? "Unknown room";
}

async function getBoxActivityContext(
  boxId: string,
  userId: string,
): Promise<{ id: string; name: string; roomName: string }> {
  const box = await assertUserOwnsBox(boxId, userId);
  const roomName = await getRoomNameByLocationId(box.location_id, userId);

  return {
    id: box.id,
    name: box.name,
    roomName,
  };
}

async function listItemsByBox(boxId: string): Promise<ItemSummary[]> {
  const normalizedBoxId = normalizeBoxId(boxId);
  const userId = await getCurrentUserId();

  await assertUserOwnsBox(normalizedBoxId, userId);

  const { data, error } = await supabase
    .from("items")
    .select("id,name,notes,quantity,box_id,created_at,updated_at")
    .eq("user_id", userId)
    .eq("box_id", normalizedBoxId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((item: ItemRow) => mapItem(item));
}

async function createItem(input: CreateItemInput): Promise<string> {
  const name = normalizeName(input.name);
  const quantity = normalizeQuantity(input.quantity);
  const notes = normalizeNotes(input.notes);
  const boxId = normalizeBoxId(input.boxId);
  const userId = await getCurrentUserId();

  const targetBox = await getBoxActivityContext(boxId, userId);

  const { data, error } = await supabase
    .from("items")
    .insert({
      user_id: userId,
      box_id: boxId,
      name,
      quantity,
      notes,
    })
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data?.id) {
    throw new Error("Failed to create item.");
  }

  await activityService.writeActivitySafely({
    type: "Created",
    entityType: "item",
    entityId: data.id,
    title: "Item created",
    description: `Added item "${name}" to "${targetBox.name}".`,
    roomName: targetBox.roomName,
    boxName: targetBox.name,
    next: {
      name,
      quantity,
      notes,
      boxId: targetBox.id,
      boxName: targetBox.name,
      roomName: targetBox.roomName,
    },
  });

  return data.id;
}

async function updateItem(itemId: string, input: UpdateItemInput): Promise<void> {
  const normalizedItemId = itemId.trim();
  const name = normalizeName(input.name);
  const quantity = normalizeQuantity(input.quantity);
  const notes = normalizeNotes(input.notes);
  const boxId = normalizeBoxId(input.boxId);

  if (!normalizedItemId) {
    throw new Error("Item id is required.");
  }

  const userId = await getCurrentUserId();
  const { data: itemBeforeUpdate, error: itemBeforeUpdateError } = await supabase
    .from("items")
    .select("id,name,notes,quantity,box_id")
    .eq("id", normalizedItemId)
    .eq("user_id", userId)
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
      notes,
      box_id: boxId,
    })
    .eq("id", normalizedItemId)
    .eq("user_id", userId)
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
  const previousNotes = itemBeforeUpdate.notes?.trim() || null;
  const hasNameChanged = previousName !== name;
  const hasQuantityChanged = previousQuantity !== quantity;
  const hasNotesChanged = previousNotes !== notes;
  const hasBoxChanged = itemBeforeUpdate.box_id !== boxId;
  const hasAnyChange = hasNameChanged || hasQuantityChanged || hasNotesChanged || hasBoxChanged;

  if (!hasAnyChange) {
    return;
  }

  if (hasBoxChanged) {
    await activityService.writeActivitySafely({
      type: "Moved",
      entityType: "item",
      entityId: normalizedItemId,
      title: "Item moved",
      description: `Moved item "${name}" from "${previousBox.name}" to "${targetBox.name}".`,
      roomName: targetBox.roomName,
      boxName: targetBox.name,
      previous: {
        boxId: previousBox.id,
        boxName: previousBox.name,
        roomName: previousBox.roomName,
      },
      next: {
        boxId: targetBox.id,
        boxName: targetBox.name,
        roomName: targetBox.roomName,
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
    roomName: targetBox.roomName,
    boxName: targetBox.name,
    previous: {
      name: previousName,
      quantity: previousQuantity,
      notes: previousNotes,
    },
    next: {
      name,
      quantity,
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
    .select("id,name,notes,quantity,box_id")
    .eq("id", normalizedItemId)
    .eq("user_id", userId)
    .maybeSingle();

  if (itemBeforeDeleteError) throw itemBeforeDeleteError;
  if (!itemBeforeDelete) {
    throw new Error("Item not found.");
  }

  const boxContext = await getBoxActivityContext(itemBeforeDelete.box_id, userId);

  const { data, error } = await supabase
    .from("items")
    .delete()
    .eq("id", normalizedItemId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error("Item not found.");
  }

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
    roomName: boxContext.roomName,
    boxName: boxContext.name,
    previous: {
      name: itemName,
      quantity,
      notes: itemBeforeDelete.notes?.trim() || null,
      boxId: boxContext.id,
      boxName: boxContext.name,
      roomName: boxContext.roomName,
    },
  });
}

export const itemService = {
  listItemsByBox,
  createItem,
  updateItem,
  deleteItem,
};
