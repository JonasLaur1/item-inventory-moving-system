import { activityService } from "@/lib/activity.service";
import { supabase } from "@/lib/supabase";

type BoxStatus = "packed" | "unpacked" | "delivered" | "unpacked_at_destination";

type BoxRow = {
  id: string;
  name: string;
  status: string | null;
  room_id: string | null;
  updated_at: string | null;
  fragility: string | null;
  item_count: number;
};

type BoxDetailsRow = {
  id: string;
  name: string;
  status: string | null;
  room_id: string | null;
  updated_at: string | null;
  fragility: string | null;
};

type ItemRow = {
  id: string;
  name: string | null;
  notes: string | null;
  quantity: number | null;
  is_fragile: boolean | null;
  photo_url: string | null;
};

type RoomContextRow = {
  id: string;
  name: string;
  location_id: string;
  location: { id: string; name: string } | Array<{ id: string; name: string }> | null;
};

type RoomContext = {
  roomId: string;
  roomName: string;
  parentLocationId: string;
  parentLocationName: string;
};

export type BoxSummary = {
  id: string;
  name: string;
  status: BoxStatus;
  roomId: string;
  roomName: string;
  locationId: string;
  locationName: string;
  parentLocationId: string;
  parentLocationName: string;
  updatedAt: string | null;
  itemsCount: number;
  isFragile: boolean;
};

export type BoxDetailsItem = {
  id: string;
  name: string;
  notes: string | null;
  quantity: number;
  isFragile: boolean;
  photoUrl: string | null;
};

export type BoxDetails = BoxSummary & {
  items: BoxDetailsItem[];
};

export type CreateBoxInput = {
  name: string;
  roomId?: string;
  locationId?: string;
  status: BoxStatus;
};

export type UpdateBoxInput = {
  name: string;
  roomId?: string;
  locationId?: string;
  status: BoxStatus;
};

const BOX_HAS_ITEMS_MESSAGE = "Box has items. Empty it before deleting.";

async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;

  const userId = data.user?.id;
  if (!userId) {
    throw new Error("No authenticated user found.");
  }

  return userId;
}

function normalizeStatus(status: string | null): BoxStatus {
  switch (status?.toLowerCase()) {
    case "packed":
      return "packed";
    case "delivered":
      return "delivered";
    case "unpacked_at_destination":
      return "unpacked_at_destination";
    default:
      return "unpacked";
  }
}

function normalizeInputStatus(status: string): BoxStatus {
  const normalizedStatus = status.trim().toLowerCase() as BoxStatus;
  const valid: BoxStatus[] = ["packed", "unpacked", "delivered", "unpacked_at_destination"];

  if (!valid.includes(normalizedStatus)) {
    throw new Error("Invalid box status.");
  }

  return normalizedStatus;
}


function normalizeFragility(value: string | null): boolean {
  if (!value) {
    return false;
  }

  const normalized = value.toLowerCase();

  if (normalized === "none" || normalized === "normal" || normalized === "not_fragile") {
    return false;
  }

  return normalized.includes("fragile") || normalized === "medium" || normalized === "high";
}

function normalizeRoomContextRow(row: RoomContextRow): RoomContext {
  const location = Array.isArray(row.location) ? row.location[0] : row.location;

  return {
    roomId: row.id,
    roomName: row.name,
    parentLocationId: location?.id ?? row.location_id,
    parentLocationName: location?.name ?? "Unknown location",
  };
}

function resolveUniqueName(baseName: string, existingNames: string[]): string {
  const lower = baseName.toLowerCase();

  if (!existingNames.some((n) => n.toLowerCase() === lower)) {
    return baseName;
  }

  const escaped = baseName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^${escaped} #(\\d+)$`, "i");
  let maxN = 1;

  for (const name of existingNames) {
    const match = name.match(pattern);
    if (match) {
      maxN = Math.max(maxN, parseInt(match[1], 10));
    }
  }

  return `${baseName} #${maxN + 1}`;
}

function isForeignKeyViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const possibleCode = (error as { code?: unknown }).code;
  return possibleCode === "23503";
}

async function getRoomContextMap(userId: string, roomIds: string[]): Promise<Map<string, RoomContext>> {
  if (roomIds.length === 0) {
    return new Map<string, RoomContext>();
  }

  const { data, error } = await supabase
    .from("rooms")
    .select("id,name,location_id,location:locations(id,name)")
    .in("id", roomIds);

  if (error) throw error;

  const map = new Map<string, RoomContext>();
  (data ?? []).forEach((room: RoomContextRow) => {
    const context = normalizeRoomContextRow(room);
    map.set(context.roomId, context);
  });

  return map;
}

async function assertUserCanAccessRoom(roomId: string): Promise<RoomContext> {
  const { data, error } = await supabase
    .from("rooms")
    .select("id,name,location_id,location:locations(id,name)")
    .eq("id", roomId)
    .maybeSingle();

  if (error) throw error;
  if (data) {
    return normalizeRoomContextRow(data as RoomContextRow);
  }

  throw new Error("Room not found.");
}

async function getLocationNameById(locationId: string, userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("locations")
    .select("id,name")
    .eq("id", locationId)
    .maybeSingle();

  if (error) throw error;
  return data?.name ?? null;
}

async function findDefaultRoomInLocation(locationId: string, userId: string): Promise<RoomContext | null> {
  const { data, error } = await supabase
    .from("rooms")
    .select("id,name,location_id,location:locations(id,name)")
    .eq("location_id", locationId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return normalizeRoomContextRow(data as RoomContextRow);
}

async function resolveRoomFromInput(
  userId: string,
  input: Pick<CreateBoxInput, "roomId" | "locationId">,
): Promise<RoomContext> {
  const directRoomId = input.roomId?.trim();
  const legacyLocationOrRoomId = input.locationId?.trim();
  const candidateId = directRoomId || legacyLocationOrRoomId;

  if (!candidateId) {
    throw new Error("Room is required.");
  }

  try {
    return await assertUserCanAccessRoom(candidateId);
  } catch {
    const locationName = await getLocationNameById(candidateId, userId);
    if (!locationName) {
      throw new Error("Room not found.");
    }

    const defaultRoom = await findDefaultRoomInLocation(candidateId, userId);
    if (!defaultRoom) {
      throw new Error(`Location "${locationName}" has no rooms. Create a room first.`);
    }

    return defaultRoom;
  }
}

function mapBoxSummary(row: BoxRow, roomContextMap: Map<string, RoomContext>): BoxSummary {
  const roomContext = row.room_id ? roomContextMap.get(row.room_id) : undefined;

  const roomId = roomContext?.roomId ?? row.room_id ?? "";
  const roomName = roomContext?.roomName ?? "Unknown room";

  return {
    id: row.id,
    name: row.name,
    status: normalizeStatus(row.status),
    roomId,
    roomName,
    locationId: roomId,
    locationName: roomName,
    parentLocationId: roomContext?.parentLocationId ?? "",
    parentLocationName: roomContext?.parentLocationName ?? "Unknown location",
    updatedAt: row.updated_at,
    itemsCount: row.item_count,
    isFragile: normalizeFragility(row.fragility),
  };
}

async function listBoxes(): Promise<BoxSummary[]> {
  const userId = await getCurrentUserId();

  const { data: rawBoxes, error: boxesError } = await supabase
    .from("boxes")
    .select("id,name,status,room_id,updated_at,fragility")
    .order("created_at", { ascending: true });

  if (boxesError) throw boxesError;
  if (!rawBoxes || rawBoxes.length === 0) {
    return [];
  }

  const allBoxIds = rawBoxes.map((box) => box.id);
  const itemCountByBoxId = new Map<string, number>();

  if (allBoxIds.length > 0) {
    const { data: itemRows, error: itemsError } = await supabase
      .from("items")
      .select("box_id,quantity")
      .in("box_id", allBoxIds);

    if (itemsError) throw itemsError;

    (itemRows ?? []).forEach((item: { box_id: string | null; quantity: number | null }) => {
      if (!item.box_id) return;
      const prev = itemCountByBoxId.get(item.box_id) ?? 0;
      itemCountByBoxId.set(item.box_id, prev + (typeof item.quantity === "number" ? item.quantity : 0));
    });
  }

  const boxes: BoxRow[] = rawBoxes.map((box) => ({
    ...box,
    item_count: itemCountByBoxId.get(box.id) ?? 0,
  }));

  const roomIds = Array.from(
    new Set(boxes.map((box) => box.room_id).filter((roomId): roomId is string => Boolean(roomId))),
  );
  const roomContextMap = await getRoomContextMap(userId, roomIds);

  return boxes.map((box) => mapBoxSummary(box, roomContextMap));
}

async function getBoxDetails(boxId: string): Promise<BoxDetails> {
  const normalizedBoxId = boxId.trim();
  if (!normalizedBoxId) {
    throw new Error("Box id is required.");
  }

  const userId = await getCurrentUserId();

  const { data: box, error: boxError } = await supabase
    .from("boxes")
    .select("id,name,status,room_id,updated_at,fragility")
    .eq("id", normalizedBoxId)
    .maybeSingle();

  if (boxError) throw boxError;
  if (!box) {
    throw new Error("Box not found.");
  }

  const [roomContextMap, itemsResult] = await Promise.all([
    getRoomContextMap(userId, box.room_id ? [box.room_id] : []),
    supabase
      .from("items")
      .select("id,name,notes,quantity,is_fragile,photo_url")
      .eq("box_id", normalizedBoxId)
      .order("created_at", { ascending: true }),
  ]);

  if (itemsResult.error) throw itemsResult.error;

  const items = (itemsResult.data ?? []).map((item: ItemRow) => ({
    id: item.id,
    name: item.name?.trim() || "Unnamed item",
    notes: item.notes,
    quantity: typeof item.quantity === "number" && item.quantity > 0 ? item.quantity : 1,
    isFragile: item.is_fragile === true,
    photoUrl: item.photo_url ?? null,
  }));

  const row = {
    ...(box as BoxDetailsRow),
    item_count: items.reduce((total, i) => total + i.quantity, 0),
  };

  return {
    ...mapBoxSummary(row, roomContextMap),
    items,
  };
}

async function createBox(input: CreateBoxInput): Promise<string> {
  const name = input.name.trim();
  const status = normalizeInputStatus(input.status);

  if (!name) {
    throw new Error("Box name is required.");
  }

  const userId = await getCurrentUserId();
  const roomContext = await resolveRoomFromInput(userId, input);

  const { data: siblingData } = await supabase
    .from("boxes")
    .select("name")
    .eq("room_id", roomContext.roomId)
    .ilike("name", `${name}%`);

  const siblingNames = (siblingData ?? [])
    .map((row: { name: string }) => row.name)
    .filter((n) => {
      const lower = n.toLowerCase();
      const base = name.toLowerCase();
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return lower === base || new RegExp(`^${escaped} #\\d+$`, "i").test(n);
    });

  const resolvedName = resolveUniqueName(name, siblingNames);

  const { data, error } = await supabase
    .from("boxes")
    .insert({
      user_id: userId,
      room_id: roomContext.roomId,
      name: resolvedName,
      status,
    })
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data?.id) {
    throw new Error("Failed to create box.");
  }

  await activityService.writeActivitySafely({
    type: "Created",
    entityType: "box",
    entityId: data.id,
    title: "Box created",
    description: `Created box "${resolvedName}" in room "${roomContext.roomName}".`,
    locationName: roomContext.parentLocationName,
    roomName: roomContext.roomName,
    boxName: resolvedName,
    next: {
      name: resolvedName,
      status,
      roomId: roomContext.roomId,
      roomName: roomContext.roomName,
      locationId: roomContext.parentLocationId,
      locationName: roomContext.parentLocationName,
    },
  });

  return data.id;
}

async function updateBox(boxId: string, input: UpdateBoxInput): Promise<void> {
  const normalizedBoxId = boxId.trim();
  const name = input.name.trim();
  const status = normalizeInputStatus(input.status);

  if (!normalizedBoxId) {
    throw new Error("Box id is required.");
  }

  if (!name) {
    throw new Error("Box name is required.");
  }

  const userId = await getCurrentUserId();
  const nextRoom = await resolveRoomFromInput(userId, input);

  const { data: previousBox, error: previousBoxError } = await supabase
    .from("boxes")
    .select("id,name,status,room_id")
    .eq("id", normalizedBoxId)
    .maybeSingle();

  if (previousBoxError) throw previousBoxError;
  if (!previousBox) {
    throw new Error("Box not found.");
  }

  const { data, error } = await supabase
    .from("boxes")
    .update({
      name,
      room_id: nextRoom.roomId,
      status,
    })
    .eq("id", normalizedBoxId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error("Box not found.");
  }

  const previousStatus = normalizeStatus(previousBox.status);
  const previousRoomId = previousBox.room_id ?? "";
  const hasNameChanged = previousBox.name !== name;
  const hasRoomChanged = previousRoomId !== nextRoom.roomId;
  const hasStatusChanged = previousStatus !== status;
  const hasAnyChange = hasNameChanged || hasRoomChanged || hasStatusChanged;

  if (!hasAnyChange) {
    return;
  }

  const previousRoomContextMap = await getRoomContextMap(
    userId,
    previousRoomId ? [previousRoomId, nextRoom.roomId] : [nextRoom.roomId],
  );
  const previousRoom = previousRoomId ? previousRoomContextMap.get(previousRoomId) : undefined;
  const previousRoomName = previousRoom?.roomName ?? "Unknown room";

  if (hasRoomChanged) {
    await activityService.writeActivitySafely({
      type: "Moved",
      entityType: "box",
      entityId: normalizedBoxId,
      title: "Box moved",
      description: `Moved box "${name}" from room "${previousRoomName}" to room "${nextRoom.roomName}".`,
      locationName: nextRoom.parentLocationName,
      roomName: nextRoom.roomName,
      boxName: name,
      previous: {
        roomId: previousRoomId || null,
        roomName: previousRoomName,
        locationId: previousRoom?.parentLocationId ?? null,
        locationName: previousRoom?.parentLocationName ?? null,
      },
      next: {
        roomId: nextRoom.roomId,
        roomName: nextRoom.roomName,
        locationId: nextRoom.parentLocationId,
        locationName: nextRoom.parentLocationName,
      },
    });
    return;
  }

  if (hasStatusChanged && status === "packed") {
    await activityService.writeActivitySafely({
      type: "Packed",
      entityType: "box",
      entityId: normalizedBoxId,
      title: "Box packed",
      description: `Marked box "${name}" as packed.`,
      locationName: nextRoom.parentLocationName,
      roomName: nextRoom.roomName,
      boxName: name,
      previous: { status: previousStatus },
      next: { status },
    });
    return;
  }

  const changeDetails: string[] = [];
  if (hasNameChanged) {
    changeDetails.push(`renamed from "${previousBox.name}"`);
  }
  if (hasStatusChanged) {
    changeDetails.push(`status set to "${status}"`);
  }

  await activityService.writeActivitySafely({
    type: "Updated",
    entityType: "box",
    entityId: normalizedBoxId,
    title: "Box updated",
    description:
      changeDetails.length > 0
        ? `Updated box "${name}": ${changeDetails.join(", ")}.`
        : `Updated box "${name}".`,
    locationName: nextRoom.parentLocationName,
    roomName: nextRoom.roomName,
    boxName: name,
    previous: {
      name: previousBox.name,
      status: previousStatus,
    },
    next: {
      name,
      status,
    },
  });
}

async function deleteBox(boxId: string): Promise<void> {
  const normalizedBoxId = boxId.trim();
  if (!normalizedBoxId) {
    throw new Error("Box id is required.");
  }

  const userId = await getCurrentUserId();

  const { data: boxBeforeDelete, error: boxBeforeDeleteError } = await supabase
    .from("boxes")
    .select("id,name,status,room_id")
    .eq("id", normalizedBoxId)
    .maybeSingle();

  if (boxBeforeDeleteError) throw boxBeforeDeleteError;
  if (!boxBeforeDelete) {
    throw new Error("Box not found.");
  }

  const { count, error: countError } = await supabase
    .from("items")
    .select("id", { count: "exact", head: true })
    .eq("box_id", normalizedBoxId);

  if (countError) throw countError;
  if ((count ?? 0) > 0) {
    throw new Error(BOX_HAS_ITEMS_MESSAGE);
  }

  const { data, error } = await supabase
    .from("boxes")
    .delete()
    .eq("id", normalizedBoxId)
    .select("id")
    .maybeSingle();

  if (error) {
    if (isForeignKeyViolation(error)) {
      throw new Error(BOX_HAS_ITEMS_MESSAGE);
    }

    throw error;
  }

  if (!data) {
    throw new Error("Box not found.");
  }

  const roomContextMap = await getRoomContextMap(
    userId,
    boxBeforeDelete.room_id ? [boxBeforeDelete.room_id] : [],
  );
  const roomContext = boxBeforeDelete.room_id ? roomContextMap.get(boxBeforeDelete.room_id) : undefined;
  const roomName = roomContext?.roomName ?? "Unknown room";

  await activityService.writeActivitySafely({
    type: "Deleted",
    entityType: "box",
    entityId: boxBeforeDelete.id,
    title: "Box deleted",
    description: `Deleted box "${boxBeforeDelete.name}".`,
    locationName: roomContext?.parentLocationName ?? null,
    roomName,
    boxName: boxBeforeDelete.name,
    previous: {
      name: boxBeforeDelete.name,
      status: normalizeStatus(boxBeforeDelete.status),
      roomId: boxBeforeDelete.room_id,
      roomName,
      locationId: roomContext?.parentLocationId ?? null,
      locationName: roomContext?.parentLocationName ?? null,
    },
  });
}

async function markBoxDelivered(boxId: string): Promise<void> {
  const normalizedBoxId = boxId.trim();
  if (!normalizedBoxId) {
    throw new Error("Box id is required.");
  }

  const userId = await getCurrentUserId();

  const { data: box, error: fetchError } = await supabase
    .from("boxes")
    .select("id,name,room_id")
    .eq("id", normalizedBoxId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!box) {
    throw new Error("Box not found.");
  }

  const { error } = await supabase
    .from("boxes")
    .update({ status: "delivered" })
    .eq("id", normalizedBoxId);

  if (error) throw error;

  const roomContextMap = await getRoomContextMap(userId, box.room_id ? [box.room_id] : []);
  const roomContext = box.room_id ? roomContextMap.get(box.room_id) : undefined;

  await activityService.writeActivitySafely({
    type: "Delivered",
    entityType: "box",
    entityId: normalizedBoxId,
    title: "Box delivered",
    description: `Marked box "${box.name}" as delivered.`,
    locationName: roomContext?.parentLocationName ?? null,
    roomName: roomContext?.roomName ?? null,
    boxName: box.name,
    next: { status: "delivered" },
  });
}

async function markBoxUnpackedAtDestination(boxId: string): Promise<void> {
  const normalizedBoxId = boxId.trim();
  if (!normalizedBoxId) {
    throw new Error("Box id is required.");
  }

  const userId = await getCurrentUserId();

  const { data: box, error: fetchError } = await supabase
    .from("boxes")
    .select("id,name,room_id")
    .eq("id", normalizedBoxId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!box) {
    throw new Error("Box not found.");
  }

  const { error } = await supabase
    .from("boxes")
    .update({ status: "unpacked_at_destination" })
    .eq("id", normalizedBoxId);

  if (error) throw error;

  const roomContextMap = await getRoomContextMap(userId, box.room_id ? [box.room_id] : []);
  const roomContext = box.room_id ? roomContextMap.get(box.room_id) : undefined;

  await activityService.writeActivitySafely({
    type: "Updated",
    entityType: "box",
    entityId: normalizedBoxId,
    title: "Box unpacked at destination",
    description: `Marked box "${box.name}" as unpacked at destination.`,
    locationName: roomContext?.parentLocationName ?? null,
    roomName: roomContext?.roomName ?? null,
    boxName: box.name,
    next: { status: "unpacked_at_destination" },
  });
}

export const boxService = {
  listBoxes,
  getBoxDetails,
  createBox,
  updateBox,
  deleteBox,
  markBoxDelivered,
  markBoxUnpackedAtDestination,
};
