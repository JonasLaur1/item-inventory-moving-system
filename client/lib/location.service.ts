import { activityService } from "@/lib/activity.service";
import { supabase } from "@/lib/supabase";

export type LocationKind = "start" | "destination" | "other";

type LocationRow = {
  id: string;
  name: string;
  kind: string | null;
  cover_image_url: string | null;
  sort_order: number | null;
  created_at: string | null;
  updated_at: string | null;
};

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
  item_count: Array<{ count: number | null }> | null;
};

export type LocationSummary = {
  id: string;
  name: string;
  kind: LocationKind;
  coverImageUrl: string | null;
  sortOrder: number;
  createdAt: string | null;
  updatedAt: string | null;
  rooms: number;
  boxes: number;
  packedBoxes: number;
  deliveredBoxes: number;
  items: number;
};

export type LocationDetailsRoom = {
  id: string;
  locationId: string;
  name: string;
  coverImageUrl: string | null;
  sortOrder: number;
  createdAt: string | null;
  updatedAt: string | null;
  boxes: number;
  packedBoxes: number;
  items: number;
};

export type LocationDetailsBox = {
  id: string;
  roomId: string;
  roomName: string;
  name: string;
  status: string | null;
  updatedAt: string | null;
  itemsCount: number;
  isFragile: boolean;
};

export type LocationDetails = LocationSummary & {
  roomList: LocationDetailsRoom[];
  boxList: LocationDetailsBox[];
};

export type CreateLocationInput = {
  name: string;
  kind?: LocationKind;
};

export type UpdateLocationInput = {
  name?: string;
  kind?: LocationKind;
  sortOrder?: number;
  coverImageUrl?: string | null;
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

function getNestedCount(value: BoxRow["item_count"]): number {
  if (!Array.isArray(value) || value.length === 0) {
    return 0;
  }

  return value.reduce((total, entry) => {
    const count = entry?.count;
    return total + (typeof count === "number" ? count : 0);
  }, 0);
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

function normalizeLocationKind(value: string | null | undefined): LocationKind {
  const normalized = value?.trim().toLowerCase();

  if (normalized === "start" || normalized === "destination" || normalized === "other") {
    return normalized;
  }

  return "other";
}

function isForeignKeyViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const possibleCode = (error as { code?: unknown }).code;
  return possibleCode === "23503";
}

type LocationAggregation = {
  rooms: RoomRow[];
  boxesByRoomId: Map<string, BoxRow[]>;
};

async function getLocationAggregation(userId: string, locationIds: string[]): Promise<LocationAggregation> {
  if (locationIds.length === 0) {
    return {
      rooms: [],
      boxesByRoomId: new Map<string, BoxRow[]>(),
    };
  }

  const { data: rooms, error: roomsError } = await supabase
    .from("rooms")
    .select("id,location_id,name,cover_image_url,sort_order,created_at,updated_at")
    .eq("user_id", userId)
    .in("location_id", locationIds)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (roomsError) throw roomsError;

  const roomIds = (rooms ?? []).map((room: RoomRow) => room.id);
  if (roomIds.length === 0) {
    return {
      rooms: rooms ?? [],
      boxesByRoomId: new Map<string, BoxRow[]>(),
    };
  }

  const { data: boxes, error: boxesError } = await supabase
    .from("boxes")
    .select("id,room_id,status,updated_at,fragility,name,item_count:items(count)")
    .in("room_id", roomIds);

  if (boxesError) throw boxesError;

  const boxesByRoomId = new Map<string, BoxRow[]>();
  (boxes ?? []).forEach((box: BoxRow) => {
    if (!box.room_id) {
      return;
    }

    const current = boxesByRoomId.get(box.room_id) ?? [];
    current.push(box);
    boxesByRoomId.set(box.room_id, current);
  });

  return {
    rooms: rooms ?? [],
    boxesByRoomId,
  };
}

function mapLocationSummaries(locations: LocationRow[], aggregation: LocationAggregation): LocationSummary[] {
  const roomsByLocationId = new Map<string, RoomRow[]>();
  aggregation.rooms.forEach((room) => {
    const current = roomsByLocationId.get(room.location_id) ?? [];
    current.push(room);
    roomsByLocationId.set(room.location_id, current);
  });

  return locations.map((location) => {
    const locationRooms = roomsByLocationId.get(location.id) ?? [];
    let boxes = 0;
    let packedBoxes = 0;
    let deliveredBoxes = 0;
    let items = 0;

    locationRooms.forEach((room) => {
      const roomBoxes = aggregation.boxesByRoomId.get(room.id) ?? [];
      boxes += roomBoxes.length;

      roomBoxes.forEach((box) => {
        const status = box.status?.toLowerCase();
        if (status === "packed") {
          packedBoxes += 1;
        }
        if (status === "delivered" || status === "unpacked_at_destination") {
          deliveredBoxes += 1;
        }
        items += getNestedCount(box.item_count);
      });
    });

    return {
      id: location.id,
      name: location.name,
      kind: normalizeLocationKind(location.kind),
      coverImageUrl: location.cover_image_url,
      sortOrder: location.sort_order ?? 0,
      createdAt: location.created_at,
      updatedAt: location.updated_at,
      rooms: locationRooms.length,
      boxes,
      packedBoxes,
      deliveredBoxes,
      items,
    };
  });
}

async function listLocationSummaries(): Promise<LocationSummary[]> {
  const userId = await getCurrentUserId();

  const { data: locations, error: locationsError } = await supabase
    .from("locations")
    .select("id,name,kind,cover_image_url,sort_order,created_at,updated_at")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (locationsError) throw locationsError;
  if (!locations || locations.length === 0) {
    return [];
  }

  const aggregation = await getLocationAggregation(
    userId,
    locations.map((location: LocationRow) => location.id),
  );

  return mapLocationSummaries(locations, aggregation);
}

async function createLocation(input: string | CreateLocationInput): Promise<{ id: string }> {
  const normalizedInput = typeof input === "string" ? { name: input } : input;

  const trimmedName = normalizedInput.name.trim();
  if (!trimmedName) {
    throw new Error("Location name is required.");
  }

  const kind = normalizeLocationKind(normalizedInput.kind);
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("locations")
    .insert({
      user_id: userId,
      name: trimmedName,
      kind,
    })
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data?.id) {
    throw new Error("Failed to create location.");
  }

  await activityService.writeActivitySafely({
    type: "Created",
    entityType: "location",
    entityId: data.id,
    title: "Location created",
    description: `Created location "${trimmedName}".`,
    locationName: trimmedName,
    next: { name: trimmedName, kind },
  });

  return { id: data.id };
}

async function updateLocation(locationId: string, input: UpdateLocationInput): Promise<void> {
  const normalizedLocationId = locationId.trim();
  if (!normalizedLocationId) {
    throw new Error("Location id is required.");
  }

  const userId = await getCurrentUserId();

  const { data: existingLocation, error: existingError } = await supabase
    .from("locations")
    .select("id,name,kind,sort_order,cover_image_url")
    .eq("id", normalizedLocationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (!existingLocation) {
    throw new Error("Location not found.");
  }

  const nextName = input.name !== undefined ? input.name.trim() : existingLocation.name;
  if (!nextName) {
    throw new Error("Location name is required.");
  }

  const nextKind = input.kind !== undefined ? normalizeLocationKind(input.kind) : normalizeLocationKind(existingLocation.kind);
  const nextSortOrder = input.sortOrder ?? existingLocation.sort_order ?? 0;
  const nextCoverImageUrl =
    input.coverImageUrl !== undefined ? input.coverImageUrl : existingLocation.cover_image_url;

  const updates: {
    name?: string;
    kind?: LocationKind;
    sort_order?: number;
    cover_image_url?: string | null;
  } = {};

  if (input.name !== undefined) {
    updates.name = nextName;
  }
  if (input.kind !== undefined) {
    updates.kind = nextKind;
  }
  if (input.sortOrder !== undefined) {
    updates.sort_order = nextSortOrder;
  }
  if (input.coverImageUrl !== undefined) {
    updates.cover_image_url = nextCoverImageUrl;
  }

  if (Object.keys(updates).length === 0) {
    return;
  }

  const { data, error } = await supabase
    .from("locations")
    .update(updates)
    .eq("id", normalizedLocationId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error("Location not found.");
  }

  const hasChanges =
    nextName !== existingLocation.name ||
    nextKind !== normalizeLocationKind(existingLocation.kind) ||
    nextSortOrder !== (existingLocation.sort_order ?? 0) ||
    nextCoverImageUrl !== existingLocation.cover_image_url;

  if (!hasChanges) {
    return;
  }

  await activityService.writeActivitySafely({
    type: "Updated",
    entityType: "location",
    entityId: normalizedLocationId,
    title: "Location updated",
    description: `Updated location "${nextName}".`,
    locationName: nextName,
    previous: {
      name: existingLocation.name,
      kind: normalizeLocationKind(existingLocation.kind),
      sortOrder: existingLocation.sort_order ?? 0,
      coverImageUrl: existingLocation.cover_image_url,
    },
    next: {
      name: nextName,
      kind: nextKind,
      sortOrder: nextSortOrder,
      coverImageUrl: nextCoverImageUrl,
    },
  });
}

async function updateLocationName(locationId: string, name: string): Promise<void> {
  await updateLocation(locationId, { name });
}

async function deleteLocation(locationId: string): Promise<void> {
  const normalizedLocationId = locationId.trim();
  if (!normalizedLocationId) {
    throw new Error("Location id is required.");
  }

  const userId = await getCurrentUserId();

  const { data: locationBeforeDelete, error: locationFetchError } = await supabase
    .from("locations")
    .select("id,name")
    .eq("id", normalizedLocationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (locationFetchError) throw locationFetchError;
  if (!locationBeforeDelete) {
    throw new Error("Location not found.");
  }

  const { data, error } = await supabase
    .from("locations")
    .delete()
    .eq("id", normalizedLocationId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    if (isForeignKeyViolation(error)) {
      throw new Error("Location has rooms. Remove or move its rooms before deleting it.");
    }

    throw error;
  }

  if (!data) {
    throw new Error("Location not found.");
  }

  await activityService.writeActivitySafely({
    type: "Deleted",
    entityType: "location",
    entityId: locationBeforeDelete.id,
    title: "Location deleted",
    description: `Deleted location "${locationBeforeDelete.name}".`,
    locationName: locationBeforeDelete.name,
    previous: { name: locationBeforeDelete.name },
  });
}

async function getLocationDetails(locationId: string): Promise<LocationDetails> {
  const normalizedLocationId = locationId.trim();

  if (!normalizedLocationId) {
    throw new Error("Location id is required.");
  }

  const userId = await getCurrentUserId();

  const { data: location, error: locationError } = await supabase
    .from("locations")
    .select("id,name,kind,cover_image_url,sort_order,created_at,updated_at")
    .eq("id", normalizedLocationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (locationError) throw locationError;
  if (!location) {
    throw new Error("Location not found.");
  }

  const aggregation = await getLocationAggregation(userId, [normalizedLocationId]);
  const summary = mapLocationSummaries([location], aggregation)[0];

  const roomList: LocationDetailsRoom[] = aggregation.rooms
    .filter((room) => room.location_id === normalizedLocationId)
    .map((room) => {
      const roomBoxes = aggregation.boxesByRoomId.get(room.id) ?? [];
      const boxes = roomBoxes.length;
      const packedBoxes = roomBoxes.filter((box) => box.status?.toLowerCase() === "packed").length;
      const items = roomBoxes.reduce((total, box) => total + getNestedCount(box.item_count), 0);

      return {
        id: room.id,
        locationId: room.location_id,
        name: room.name,
        coverImageUrl: room.cover_image_url,
        sortOrder: room.sort_order ?? 0,
        createdAt: room.created_at,
        updatedAt: room.updated_at,
        boxes,
        packedBoxes,
        items,
      };
    });

  const boxList: LocationDetailsBox[] = roomList.flatMap((room) =>
    (aggregation.boxesByRoomId.get(room.id) ?? []).map((box: BoxRow, index: number) => ({
      id: box.id,
      roomId: room.id,
      roomName: room.name,
      name: box.name?.trim() || `Box #${index + 1}`,
      status: box.status,
      updatedAt: box.updated_at,
      itemsCount: getNestedCount(box.item_count),
      isFragile: normalizeFragility(box.fragility),
    })),
  );

  return {
    ...summary,
    roomList,
    boxList,
  };
}

export const locationService = {
  listLocationSummaries,
  createLocation,
  updateLocation,
  updateLocationName,
  deleteLocation,
  getLocationDetails,
};
