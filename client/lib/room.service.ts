import { activityService } from "@/lib/activity.service";
import { supabase } from "@/lib/supabase";
import { getCurrentUserId, normalizeFragility, resolveUniqueName } from "@/lib/utils/service-utils";

type RoomRow = {
  id: string;
  location_id: string;
  name: string;
  cover_image_url: string | null;
  sort_order: number | null;
  created_at: string | null;
  updated_at: string | null;
};

type BoxRow = {
  id: string;
  room_id: string | null;
  status: string | null;
  updated_at: string | null;
  fragility: string | null;
  name: string | null;
  item_count: number;
};

type LocationRow = {
  id: string;
  name: string;
};

export type RoomSummary = {
  id: string;
  locationId: string;
  locationName: string;
  name: string;
  coverImageUrl: string | null;
  sortOrder: number;
  createdAt: string | null;
  updatedAt: string | null;
  boxes: number;
  packedBoxes: number;
  items: number;
};

export type RoomDetailsBox = {
  id: string;
  name: string;
  status: string | null;
  updatedAt: string | null;
  itemsCount: number;
  isFragile: boolean;
};

export type RoomDetails = RoomSummary & {
  isOwner: boolean;
  boxList: RoomDetailsBox[];
};

export type CreateRoomInput = {
  locationId: string;
  name: string;
};

export type UpdateRoomInput = {
  locationId?: string;
  name?: string;
};

function isForeignKeyViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const possibleCode = (error as { code?: unknown }).code;
  return possibleCode === "23503";
}

async function getLocationNameMap(userId: string, locationIds: string[]): Promise<Map<string, string>> {
  if (locationIds.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await supabase
    .from("locations")
    .select("id,name")
    .in("id", locationIds);

  if (error) throw error;

  const map = new Map<string, string>();
  (data ?? []).forEach((location: LocationRow) => {
    map.set(location.id, location.name);
  });

  return map;
}

function mapRoomSummaries(
  rooms: RoomRow[],
  boxes: BoxRow[],
  locationNameMap: Map<string, string>,
): RoomSummary[] {
  const roomStats = new Map<string, { boxes: number; packedBoxes: number; items: number }>();

  for (const room of rooms) {
    roomStats.set(room.id, { boxes: 0, packedBoxes: 0, items: 0 });
  }

  for (const box of boxes) {
    if (!box.room_id || !roomStats.has(box.room_id)) {
      continue;
    }

    const current = roomStats.get(box.room_id);
    if (!current) {
      continue;
    }

    current.boxes += 1;
    if (box.status?.toLowerCase() === "packed") {
      current.packedBoxes += 1;
    }
    current.items += box.item_count;
  }

  return rooms.map((room) => {
    const stats = roomStats.get(room.id) ?? { boxes: 0, packedBoxes: 0, items: 0 };

    return {
      id: room.id,
      locationId: room.location_id,
      locationName: locationNameMap.get(room.location_id) ?? "Unknown location",
      name: room.name,
      coverImageUrl: room.cover_image_url,
      sortOrder: room.sort_order ?? 0,
      createdAt: room.created_at,
      updatedAt: room.updated_at,
      boxes: stats.boxes,
      packedBoxes: stats.packedBoxes,
      items: stats.items,
    };
  });
}

async function listRoomSummaries(locationId?: string): Promise<RoomSummary[]> {
  const userId = await getCurrentUserId();

  let query = supabase
    .from("rooms")
    .select("id,location_id,name,cover_image_url,sort_order,created_at,updated_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (locationId?.trim()) {
    query = query.eq("location_id", locationId.trim());
  }

  const { data: rooms, error: roomsError } = await query;

  if (roomsError) throw roomsError;
  if (!rooms || rooms.length === 0) {
    return [];
  }

  const roomIds = rooms.map((room: RoomRow) => room.id);
  const locationIds = Array.from(new Set(rooms.map((room: RoomRow) => room.location_id)));

  const [locationNameMap, boxesResult] = await Promise.all([
    getLocationNameMap(userId, locationIds),
    supabase.from("boxes").select("id,room_id,status,updated_at,fragility,name").in("room_id", roomIds),
  ]);

  if (boxesResult.error) throw boxesResult.error;

  const rawBoxes = boxesResult.data ?? [];
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

  return mapRoomSummaries(rooms, boxes, locationNameMap);
}

async function assertUserCanAccessLocation(locationId: string): Promise<string> {
  const { data, error } = await supabase
    .from("locations")
    .select("id,name")
    .eq("id", locationId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error("Location not found.");
  }

  return data.name;
}

async function createRoom(input: CreateRoomInput): Promise<string> {
  const locationId = input.locationId.trim();
  const name = input.name.trim();

  if (!locationId) {
    throw new Error("Location is required.");
  }
  if (!name) {
    throw new Error("Room name is required.");
  }

  const userId = await getCurrentUserId();
  const locationName = await assertUserCanAccessLocation(locationId);

  const { data: siblingData } = await supabase
    .from("rooms")
    .select("name")
    .eq("location_id", locationId)
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
    .from("rooms")
    .insert({
      user_id: userId,
      location_id: locationId,
      name: resolvedName,
    })
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data?.id) {
    throw new Error("Failed to create room.");
  }

  await activityService.writeActivitySafely({
    type: "Created",
    entityType: "room",
    entityId: data.id,
    title: "Room created",
    description: `Created room "${resolvedName}" in "${locationName}".`,
    locationName,
    roomName: resolvedName,
    next: {
      name: resolvedName,
      locationId,
      locationName,
    },
  });

  return data.id;
}

async function getRoomDetails(roomId: string): Promise<RoomDetails> {
  const normalizedRoomId = roomId.trim();
  if (!normalizedRoomId) {
    throw new Error("Room id is required.");
  }

  const userId = await getCurrentUserId();

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("id,location_id,name,cover_image_url,sort_order,created_at,updated_at")
    .eq("id", normalizedRoomId)
    .maybeSingle();

  if (roomError) throw roomError;
  if (!room) {
    throw new Error("Room not found.");
  }

  const [locationNameMap, boxesResult, locationResult] = await Promise.all([
    getLocationNameMap(userId, [room.location_id]),
    supabase
      .from("boxes")
      .select("id,room_id,name,status,updated_at,fragility")
      .eq("room_id", normalizedRoomId)
      .order("created_at", { ascending: true }),
    supabase
      .from("locations")
      .select("user_id")
      .eq("id", room.location_id)
      .maybeSingle(),
  ]);

  const isOwner = locationResult.data?.user_id === userId;

  if (boxesResult.error) throw boxesResult.error;

  const rawBoxes = boxesResult.data ?? [];
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

  const typedBoxes: BoxRow[] = rawBoxes.map((box) => ({
    ...box,
    item_count: itemCountByBoxId.get(box.id) ?? 0,
  }));

  const summary = mapRoomSummaries([room], typedBoxes, locationNameMap)[0];

  const boxList: RoomDetailsBox[] = typedBoxes.map((box, index) => ({
    id: box.id,
    name: box.name?.trim() || `Box #${index + 1}`,
    status: box.status,
    updatedAt: box.updated_at,
    itemsCount: box.item_count,
    isFragile: normalizeFragility(box.fragility),
  }));

  return {
    ...summary,
    isOwner,
    boxList,
  };
}

async function updateRoom(roomId: string, input: UpdateRoomInput): Promise<void> {
  const normalizedRoomId = roomId.trim();
  if (!normalizedRoomId) {
    throw new Error("Room id is required.");
  }

  const name = input.name?.trim();
  const locationId = input.locationId?.trim();

  if (input.name !== undefined && !name) {
    throw new Error("Room name is required.");
  }

  if (input.locationId !== undefined && !locationId) {
    throw new Error("Location is required.");
  }

  const userId = await getCurrentUserId();

  const { data: existingRoom, error: existingError } = await supabase
    .from("rooms")
    .select("id,name,location_id")
    .eq("id", normalizedRoomId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (!existingRoom) {
    throw new Error("Room not found.");
  }

  const nextLocationId = locationId ?? existingRoom.location_id;
  const nextName = name ?? existingRoom.name;
  const nextLocationName = await assertUserCanAccessLocation(nextLocationId);

  const updates: Record<string, string> = {};
  if (name !== undefined) {
    updates.name = nextName;
  }
  if (locationId !== undefined) {
    updates.location_id = nextLocationId;
  }

  if (Object.keys(updates).length === 0) {
    return;
  }

  const { data, error } = await supabase
    .from("rooms")
    .update(updates)
    .eq("id", normalizedRoomId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error("Room not found.");
  }

  if (existingRoom.name === nextName && existingRoom.location_id === nextLocationId) {
    return;
  }

  const previousLocationName =
    existingRoom.location_id === nextLocationId
      ? nextLocationName
      : await assertUserCanAccessLocation(existingRoom.location_id);

  await activityService.writeActivitySafely({
    type: existingRoom.location_id !== nextLocationId ? "Moved" : "Updated",
    entityType: "room",
    entityId: normalizedRoomId,
    title: existingRoom.location_id !== nextLocationId ? "Room moved" : "Room updated",
    description:
      existingRoom.location_id !== nextLocationId
        ? `Moved room "${nextName}" to "${nextLocationName}".`
        : `Updated room "${nextName}".`,
    locationName: nextLocationName,
    roomName: nextName,
    previous: {
      name: existingRoom.name,
      locationId: existingRoom.location_id,
      locationName: previousLocationName,
    },
    next: {
      name: nextName,
      locationId: nextLocationId,
      locationName: nextLocationName,
    },
  });
}

async function updateRoomName(roomId: string, name: string): Promise<void> {
  await updateRoom(roomId, { name });
}

async function deleteRoom(roomId: string): Promise<void> {
  const normalizedRoomId = roomId.trim();
  if (!normalizedRoomId) {
    throw new Error("Room id is required.");
  }

  const userId = await getCurrentUserId();

  const { data: roomBeforeDelete, error: roomFetchError } = await supabase
    .from("rooms")
    .select("id,name,location_id")
    .eq("id", normalizedRoomId)
    .maybeSingle();

  if (roomFetchError) throw roomFetchError;
  if (!roomBeforeDelete) {
    throw new Error("Room not found.");
  }

  const locationName = await assertUserCanAccessLocation(roomBeforeDelete.location_id);

  await activityService.writeActivitySafely({
    type: "Deleted",
    entityType: "room",
    entityId: roomBeforeDelete.id,
    title: "Room deleted",
    description: `Deleted room "${roomBeforeDelete.name}".`,
    locationName,
    roomName: roomBeforeDelete.name,
    previous: {
      name: roomBeforeDelete.name,
      locationId: roomBeforeDelete.location_id,
      locationName,
    },
  });

  const { data, error } = await supabase
    .from("rooms")
    .delete()
    .eq("id", normalizedRoomId)
    .select("id")
    .maybeSingle();

  if (error) {
    if (isForeignKeyViolation(error)) {
      throw new Error("Room has boxes. Remove or move its boxes before deleting it.");
    }

    throw error;
  }
  if (!data) {
    throw new Error("Room not found.");
  }
}

export const roomService = {
  listRoomSummaries,
  createRoom,
  getRoomDetails,
  updateRoom,
  updateRoomName,
  deleteRoom,
};
