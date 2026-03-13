import { activityService } from "@/lib/activity.service";
import { supabase } from "@/lib/supabase";

type LocationRow = {
  id: string;
  name: string;
  cover_image_url: string | null;
  sort_order: number | null;
  created_at: string | null;
  updated_at: string | null;
};

type BoxRow = {
  location_id: string | null;
  status: string | null;
  item_count: Array<{ count: number | null }> | null;
};

type RoomDetailsBoxRow = {
  id: string;
  name: string;
  status: string | null;
  updated_at: string | null;
  item_count: Array<{ count: number | null }> | null;
};

export type LocationSummary = {
  id: string;
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
  name: string;
  status: string | null;
  updatedAt: string | null;
  itemsCount: number;
};

export type LocationDetails = LocationSummary & {
  boxList: LocationDetailsBox[];
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

function mapLocationSummaries(locations: LocationRow[], boxes: BoxRow[]): LocationSummary[] {
  const locationStats = new Map<string, { boxes: number; packedBoxes: number; items: number }>();

  for (const location of locations) {
    locationStats.set(location.id, { boxes: 0, packedBoxes: 0, items: 0 });
  }

  for (const box of boxes) {
    if (!box.location_id || !locationStats.has(box.location_id)) {
      continue;
    }

    const current = locationStats.get(box.location_id);
    if (!current) {
      continue;
    }

    current.boxes += 1;

    const normalizedStatus = box.status?.toLowerCase();
    if (normalizedStatus === "packed") {
      current.packedBoxes += 1;
    }

    current.items += getNestedCount(box.item_count);
  }

  return locations.map((location) => {
    const stats = locationStats.get(location.id) ?? { boxes: 0, packedBoxes: 0, items: 0 };
    return {
      id: location.id,
      name: location.name,
      coverImageUrl: location.cover_image_url,
      sortOrder: location.sort_order ?? 0,
      createdAt: location.created_at,
      updatedAt: location.updated_at,
      boxes: stats.boxes,
      packedBoxes: stats.packedBoxes,
      items: stats.items,
    };
  });
}

async function listLocationSummaries(): Promise<LocationSummary[]> {
  const userId = await getCurrentUserId();

  const { data: locations, error: locationsError } = await supabase
    .from("locations")
    .select("id,name,cover_image_url,sort_order,created_at,updated_at")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (locationsError) throw locationsError;
  if (!locations || locations.length === 0) {
    return [];
  }

  const locationIds = locations.map((location) => location.id);

  const { data: boxes, error: boxesError } = await supabase
    .from("boxes")
    .select("location_id,status,item_count:items(count)")
    .in("location_id", locationIds);

  if (boxesError) throw boxesError;

  return mapLocationSummaries(locations ?? [], boxes ?? []);
}

async function createLocation(name: string): Promise<void> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Location name is required.");
  }

  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("locations")
    .insert({
      user_id: userId,
      name: trimmedName,
    })
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data?.id) {
    throw new Error("Failed to create room.");
  }

  await activityService.writeActivitySafely({
    type: "Created",
    entityType: "location",
    entityId: data.id,
    title: "Room created",
    description: `Created room "${trimmedName}".`,
    roomName: trimmedName,
    next: { name: trimmedName },
  });
}

async function updateLocationName(locationId: string, name: string): Promise<void> {
  const normalizedLocationId = locationId.trim();
  if (!normalizedLocationId) {
    throw new Error("Location id is required.");
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Location name is required.");
  }

  const userId = await getCurrentUserId();

  const { data: existingLocation, error: existingError } = await supabase
    .from("locations")
    .select("id,name")
    .eq("id", normalizedLocationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (!existingLocation) {
    throw new Error("Room not found.");
  }

  const { data, error } = await supabase
    .from("locations")
    .update({ name: trimmedName })
    .eq("id", normalizedLocationId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error("Room not found.");
  }

  if (existingLocation.name === trimmedName) {
    return;
  }

  await activityService.writeActivitySafely({
    type: "Updated",
    entityType: "location",
    entityId: normalizedLocationId,
    title: "Room updated",
    description: `Renamed room "${existingLocation.name}" to "${trimmedName}".`,
    roomName: trimmedName,
    previous: { name: existingLocation.name },
    next: { name: trimmedName },
  });
}

function isForeignKeyViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const possibleCode = (error as { code?: unknown }).code;
  return possibleCode === "23503";
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

  if (locationFetchError) {
    throw locationFetchError;
  }
  if (!locationBeforeDelete) {
    throw new Error("Room not found.");
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
      throw new Error("Room has boxes. Remove or move its boxes before deleting it.");
    }

    throw error;
  }

  if (!data) {
    throw new Error("Room not found.");
  }

  await activityService.writeActivitySafely({
    type: "Deleted",
    entityType: "location",
    entityId: locationBeforeDelete.id,
    title: "Room deleted",
    description: `Deleted room "${locationBeforeDelete.name}".`,
    roomName: locationBeforeDelete.name,
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
    .select("id,name,cover_image_url,sort_order,created_at,updated_at")
    .eq("id", normalizedLocationId)
    .eq("user_id", userId)
    .maybeSingle();

  const { data: boxes, error: boxesError } = await supabase
    .from("boxes")
    .select("id,name,status,updated_at,item_count:items(count)")
    .eq("location_id", normalizedLocationId)
    .order("created_at", { ascending: true });

  if (locationError) throw locationError;
  if (boxesError) throw boxesError;
  if (!location) {
    throw new Error("Room not found.");
  }

  const mappedBoxes: LocationDetailsBox[] = (boxes ?? []).map((box: RoomDetailsBoxRow) => ({
    id: box.id,
    name: box.name,
    status: box.status,
    updatedAt: box.updated_at,
    itemsCount: getNestedCount(box.item_count),
  }));

  const summary = mapLocationSummaries([location], [
    ...(boxes ?? []).map((box: RoomDetailsBoxRow) => ({
      location_id: location.id,
      status: box.status,
      item_count: box.item_count,
    })),
  ])[0];

  return {
    ...summary,
    boxList: mappedBoxes,
  };
}

export const locationService = {
  listLocationSummaries,
  createLocation,
  updateLocationName,
  deleteLocation,
  getLocationDetails,
};
