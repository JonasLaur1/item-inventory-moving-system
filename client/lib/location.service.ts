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

  const count = value[0]?.count;
  return typeof count === "number" ? count : 0;
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
  const [{ data: locations, error: locationsError }, { data: boxes, error: boxesError }] =
    await Promise.all([
      supabase
        .from("locations")
        .select("id,name,cover_image_url,sort_order,created_at,updated_at")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase.from("boxes").select("location_id,status,item_count:items(count)"),
    ]);

  if (locationsError) throw locationsError;
  if (boxesError) throw boxesError;

  return mapLocationSummaries(locations ?? [], boxes ?? []);
}

async function createLocation(name: string): Promise<void> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Location name is required.");
  }

  const userId = await getCurrentUserId();

  const { error } = await supabase.from("locations").insert({
    user_id: userId,
    name: trimmedName,
  });

  if (error) throw error;
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
}

async function getLocationDetails(locationId: string): Promise<LocationDetails> {
  const normalizedLocationId = locationId.trim();

  if (!normalizedLocationId) {
    throw new Error("Location id is required.");
  }

  const [{ data: location, error: locationError }, { data: boxes, error: boxesError }] =
    await Promise.all([
      supabase
        .from("locations")
        .select("id,name,cover_image_url,sort_order,created_at,updated_at")
        .eq("id", normalizedLocationId)
        .maybeSingle(),
      supabase
        .from("boxes")
        .select("id,name,status,updated_at,item_count:items(count)")
        .eq("location_id", normalizedLocationId)
        .order("created_at", { ascending: true }),
    ]);

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
  getLocationDetails,
};
