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

export const locationService = {
  listLocationSummaries,
  createLocation,
};
