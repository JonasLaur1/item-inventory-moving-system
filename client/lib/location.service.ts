import { activityService } from "@/lib/activity.service";
import { supabase } from "@/lib/supabase";

export type LocationKind = "start" | "destination" | "other";

type LocationRow = {
  id: string;
  user_id: string;
  name: string;
  kind: string | null;
  cover_image_url: string | null;
  sort_order: number | null;
  created_at: string | null;
  updated_at: string | null;
  address: string | null;
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
  item_count: number;
};

export type LocationSummary = {
  id: string;
  name: string;
  address: string | null;
  kind: LocationKind;
  coverImageUrl: string | null;
  sortOrder: number;
  createdAt: string | null;
  updatedAt: string | null;
  rooms: number;
  boxes: number;
  packedBoxes: number;
  deliveredBoxes: number;
  unpackedAtDestinationBoxes: number;
  items: number;
  isOwner: boolean;
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
  address?: string;
};

export type UpdateLocationInput = {
  name?: string;
  kind?: LocationKind;
  sortOrder?: number;
  coverImageUrl?: string | null;
  address?: string | null;
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

type LocationAggregation = {
  rooms: RoomRow[];
  boxesByRoomId: Map<string, BoxRow[]>;
};

async function getLocationAggregation(locationIds: string[]): Promise<LocationAggregation> {
  if (locationIds.length === 0) {
    return {
      rooms: [],
      boxesByRoomId: new Map<string, BoxRow[]>(),
    };
  }

  const { data: rooms, error: roomsError } = await supabase
    .from("rooms")
    .select("id,location_id,name,cover_image_url,sort_order,created_at,updated_at")
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

  const { data: rawBoxes, error: boxesError } = await supabase
    .from("boxes")
    .select("id,room_id,status,updated_at,fragility,name")
    .in("room_id", roomIds);

  if (boxesError) throw boxesError;

  const allBoxIds = (rawBoxes ?? []).map((box) => box.id);
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

  const boxes: BoxRow[] = (rawBoxes ?? []).map((box) => ({
    ...box,
    item_count: itemCountByBoxId.get(box.id) ?? 0,
  }));

  const boxesByRoomId = new Map<string, BoxRow[]>();
  boxes.forEach((box) => {
    if (!box.room_id) return;
    const current = boxesByRoomId.get(box.room_id) ?? [];
    current.push(box);
    boxesByRoomId.set(box.room_id, current);
  });

  return {
    rooms: rooms ?? [],
    boxesByRoomId,
  };
}

function mapLocationSummaries(locations: LocationRow[], aggregation: LocationAggregation, userId: string): LocationSummary[] {
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
    let unpackedAtDestinationBoxes = 0;
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
        if (status === "unpacked_at_destination") {
          unpackedAtDestinationBoxes += 1;
        }
        items += box.item_count;
      });
    });

    return {
      id: location.id,
      name: location.name,
      address: location.address,
      kind: normalizeLocationKind(location.kind),
      coverImageUrl: location.cover_image_url,
      sortOrder: location.sort_order ?? 0,
      createdAt: location.created_at,
      updatedAt: location.updated_at,
      rooms: locationRooms.length,
      boxes,
      packedBoxes,
      deliveredBoxes,
      unpackedAtDestinationBoxes,
      items,
      isOwner: location.user_id === userId,
    };
  });
}

async function listLocationSummaries(): Promise<LocationSummary[]> {
  const userId = await getCurrentUserId();

  const { data: locations, error: locationsError } = await supabase
    .from("locations")
    .select("id,user_id,name,address,kind,cover_image_url,sort_order,created_at,updated_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (locationsError) throw locationsError;
  if (!locations || locations.length === 0) {
    return [];
  }

  const aggregation = await getLocationAggregation(
    locations.map((location: LocationRow) => location.id),
  );

  return mapLocationSummaries(locations, aggregation, userId);
}

async function createLocation(input: string | CreateLocationInput): Promise<{ id: string }> {
  const normalizedInput = typeof input === "string" ? { name: input } : input;

  const trimmedName = normalizedInput.name.trim();
  if (!trimmedName) {
    throw new Error("Location name is required.");
  }

  const kind = normalizeLocationKind(normalizedInput.kind);
  const userId = await getCurrentUserId();

  const { data: siblingData } = await supabase
    .from("locations")
    .select("name")
    .ilike("name", `${trimmedName}%`);

  const siblingNames = (siblingData ?? [])
    .map((row: { name: string }) => row.name)
    .filter((n) => {
      const lower = n.toLowerCase();
      const base = trimmedName.toLowerCase();
      const escaped = trimmedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return lower === base || new RegExp(`^${escaped} #\\d+$`, "i").test(n);
    });

  const resolvedName = resolveUniqueName(trimmedName, siblingNames);

  const trimmedAddress = normalizedInput.address?.trim() || undefined;

  const { data, error } = await supabase
    .from("locations")
    .insert({
      user_id: userId,
      name: resolvedName,
      kind,
      ...(trimmedAddress !== undefined && { address: trimmedAddress }),
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
    description: `Created location "${resolvedName}".`,
    locationName: resolvedName,
    next: { name: resolvedName, kind },
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
    .select("id,name,kind,sort_order,cover_image_url,address")
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

  const nextAddress =
    input.address !== undefined ? input.address : existingLocation.address ?? null;

  const updates: {
    name?: string;
    kind?: LocationKind;
    sort_order?: number;
    cover_image_url?: string | null;
    address?: string | null;
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
  if (input.address !== undefined) {
    updates.address = nextAddress;
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

async function updateLocationAddress(locationId: string, address: string | null): Promise<void> {
  await updateLocation(locationId, { address });
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

  await activityService.writeActivitySafely({
    type: "Deleted",
    entityType: "location",
    entityId: locationBeforeDelete.id,
    title: "Location deleted",
    description: `Deleted location "${locationBeforeDelete.name}".`,
    locationName: locationBeforeDelete.name,
    previous: { name: locationBeforeDelete.name },
  });

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
}

async function getLocationDetails(locationId: string): Promise<LocationDetails> {
  const normalizedLocationId = locationId.trim();

  if (!normalizedLocationId) {
    throw new Error("Location id is required.");
  }

  const userId = await getCurrentUserId();

  const { data: location, error: locationError } = await supabase
    .from("locations")
    .select("id,user_id,name,address,kind,cover_image_url,sort_order,created_at,updated_at")
    .eq("id", normalizedLocationId)
    .maybeSingle();

  if (locationError) throw locationError;
  if (!location) {
    throw new Error("Location not found.");
  }

  const aggregation = await getLocationAggregation([normalizedLocationId]);
  const summary = mapLocationSummaries([location], aggregation, userId)[0];

  const roomList: LocationDetailsRoom[] = aggregation.rooms
    .filter((room) => room.location_id === normalizedLocationId)
    .map((room) => {
      const roomBoxes = aggregation.boxesByRoomId.get(room.id) ?? [];
      const boxes = roomBoxes.length;
      const packedBoxes = roomBoxes.filter((box) => box.status?.toLowerCase() === "packed").length;
      const items = roomBoxes.reduce((total, box) => total + box.item_count, 0);

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
      itemsCount: box.item_count,
      isFragile: normalizeFragility(box.fragility),
    })),
  );

  return {
    ...summary,
    roomList,
    boxList,
  };
}

async function countUncheckedItems(fromLocationId: string, toLocationId: string): Promise<number> {
  const { data: rooms, error: roomsError } = await supabase
    .from("rooms")
    .select("id")
    .in("location_id", [fromLocationId, toLocationId]);

  if (roomsError) throw roomsError;

  const roomIds = (rooms ?? []).map((r: { id: string }) => r.id);
  if (roomIds.length === 0) return 0;

  const { data: boxes, error: boxesError } = await supabase
    .from("boxes")
    .select("id")
    .in("room_id", roomIds)
    .in("status", ["delivered", "unpacked_at_destination"]);

  if (boxesError) throw boxesError;

  const boxIds = (boxes ?? []).map((b: { id: string }) => b.id);
  if (boxIds.length === 0) return 0;

  const { count, error: itemsError } = await supabase
    .from("items")
    .select("id", { count: "exact", head: true })
    .in("box_id", boxIds)
    .is("unpacked_at", null);

  if (itemsError) throw itemsError;
  return count ?? 0;
}

export const locationService = {
  listLocationSummaries,
  createLocation,
  updateLocation,
  updateLocationName,
  updateLocationAddress,
  deleteLocation,
  getLocationDetails,
  countUncheckedItems,
};
