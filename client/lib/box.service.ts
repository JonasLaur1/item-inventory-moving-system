import { supabase } from "@/lib/supabase";

type BoxStatus = "packed" | "unpacked";

type BoxRow = {
  id: string;
  name: string;
  status: string | null;
  location_id: string | null;
  updated_at: string | null;
  fragility: string | null;
  item_count: Array<{ count: number | null }> | null;
};

type BoxDetailsRow = {
  id: string;
  name: string;
  status: string | null;
  location_id: string | null;
  updated_at: string | null;
  fragility: string | null;
};

type ItemRow = {
  id: string;
  name: string | null;
  notes: string | null;
  quantity: number | null;
};

type LocationRow = {
  id: string;
  name: string;
};

export type BoxSummary = {
  id: string;
  name: string;
  status: BoxStatus;
  locationId: string;
  locationName: string;
  updatedAt: string | null;
  itemsCount: number;
  isFragile: boolean;
};

export type BoxDetailsItem = {
  id: string;
  name: string;
  notes: string | null;
  quantity: number;
};

export type BoxDetails = BoxSummary & {
  items: BoxDetailsItem[];
};

export type CreateBoxInput = {
  name: string;
  locationId: string;
  status: BoxStatus;
};

export type UpdateBoxInput = {
  name: string;
  locationId: string;
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
  return status?.toLowerCase() === "packed" ? "packed" : "unpacked";
}

function normalizeInputStatus(status: string): BoxStatus {
  const normalizedStatus = status.trim().toLowerCase();

  if (normalizedStatus !== "packed" && normalizedStatus !== "unpacked") {
    throw new Error("Box status must be Packed or Unpacked.");
  }

  return normalizedStatus;
}

function getNestedCount(value: Array<{ count: number | null }> | null): number {
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

async function assertUserOwnsLocation(locationId: string, userId: string): Promise<void> {
  const { data, error } = await supabase
    .from("locations")
    .select("id")
    .eq("id", locationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error("Room not found.");
  }
}

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
    .eq("user_id", userId)
    .in("id", locationIds);

  if (error) throw error;

  const map = new Map<string, string>();
  (data ?? []).forEach((location: LocationRow) => {
    map.set(location.id, location.name);
  });

  return map;
}

function mapBoxSummary(row: BoxRow, locationNameMap: Map<string, string>): BoxSummary {
  return {
    id: row.id,
    name: row.name,
    status: normalizeStatus(row.status),
    locationId: row.location_id ?? "",
    locationName: row.location_id ? (locationNameMap.get(row.location_id) ?? "Unknown room") : "Unknown room",
    updatedAt: row.updated_at,
    itemsCount: getNestedCount(row.item_count),
    isFragile: normalizeFragility(row.fragility),
  };
}

async function listBoxes(): Promise<BoxSummary[]> {
  const userId = await getCurrentUserId();

  const { data: boxes, error: boxesError } = await supabase
    .from("boxes")
    .select("id,name,status,location_id,updated_at,fragility,item_count:items(count)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (boxesError) throw boxesError;
  if (!boxes || boxes.length === 0) {
    return [];
  }

  const locationIds = Array.from(
    new Set(boxes.map((box: BoxRow) => box.location_id).filter((locationId): locationId is string => Boolean(locationId))),
  );
  const locationNameMap = await getLocationNameMap(userId, locationIds);

  return boxes.map((box: BoxRow) => mapBoxSummary(box, locationNameMap));
}

async function getBoxDetails(boxId: string): Promise<BoxDetails> {
  const normalizedBoxId = boxId.trim();
  if (!normalizedBoxId) {
    throw new Error("Box id is required.");
  }

  const userId = await getCurrentUserId();

  const { data: box, error: boxError } = await supabase
    .from("boxes")
    .select("id,name,status,location_id,updated_at,fragility")
    .eq("id", normalizedBoxId)
    .eq("user_id", userId)
    .maybeSingle();

  if (boxError) throw boxError;
  if (!box) {
    throw new Error("Box not found.");
  }

  const [locationNameMap, itemsResult] = await Promise.all([
    getLocationNameMap(userId, box.location_id ? [box.location_id] : []),
    supabase
      .from("items")
      .select("id,name,notes,quantity")
      .eq("user_id", userId)
      .eq("box_id", normalizedBoxId)
      .order("created_at", { ascending: true }),
  ]);

  if (itemsResult.error) throw itemsResult.error;

  const items = (itemsResult.data ?? []).map((item: ItemRow) => ({
    id: item.id,
    name: item.name?.trim() || "Unnamed item",
    notes: item.notes,
    quantity: typeof item.quantity === "number" && item.quantity > 0 ? item.quantity : 1,
  }));

  const itemCount = items.length;
  const row = {
    ...(box as BoxDetailsRow),
    item_count: [{ count: itemCount }],
  };

  return {
    ...mapBoxSummary(row, locationNameMap),
    items,
  };
}

async function createBox(input: CreateBoxInput): Promise<string> {
  const name = input.name.trim();
  const locationId = input.locationId.trim();
  const status = normalizeInputStatus(input.status);

  if (!name) {
    throw new Error("Box name is required.");
  }

  if (!locationId) {
    throw new Error("Room is required.");
  }

  const userId = await getCurrentUserId();

  await assertUserOwnsLocation(locationId, userId);

  const { data, error } = await supabase
    .from("boxes")
    .insert({
      user_id: userId,
      location_id: locationId,
      name,
      status,
    })
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data?.id) {
    throw new Error("Failed to create box.");
  }

  return data.id;
}

async function updateBox(boxId: string, input: UpdateBoxInput): Promise<void> {
  const normalizedBoxId = boxId.trim();
  const name = input.name.trim();
  const locationId = input.locationId.trim();
  const status = normalizeInputStatus(input.status);

  if (!normalizedBoxId) {
    throw new Error("Box id is required.");
  }

  if (!name) {
    throw new Error("Box name is required.");
  }

  if (!locationId) {
    throw new Error("Room is required.");
  }

  const userId = await getCurrentUserId();

  await assertUserOwnsLocation(locationId, userId);

  const { data, error } = await supabase
    .from("boxes")
    .update({
      name,
      location_id: locationId,
      status,
    })
    .eq("id", normalizedBoxId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error("Box not found.");
  }
}

async function deleteBox(boxId: string): Promise<void> {
  const normalizedBoxId = boxId.trim();
  if (!normalizedBoxId) {
    throw new Error("Box id is required.");
  }

  const userId = await getCurrentUserId();

  const { count, error: countError } = await supabase
    .from("items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("box_id", normalizedBoxId);

  if (countError) throw countError;
  if ((count ?? 0) > 0) {
    throw new Error(BOX_HAS_ITEMS_MESSAGE);
  }

  const { data, error } = await supabase
    .from("boxes")
    .delete()
    .eq("id", normalizedBoxId)
    .eq("user_id", userId)
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
}

export const boxService = {
  listBoxes,
  getBoxDetails,
  createBox,
  updateBox,
  deleteBox,
};
