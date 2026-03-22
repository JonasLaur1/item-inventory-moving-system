import { supabase } from "@/lib/supabase";

export type ActivityType = "Created" | "Updated" | "Moved" | "Deleted" | "Packed";
export type ActivityEntityType = "location" | "room" | "box" | "item";

export type ActivityPreviousNext = Record<string, unknown>;

export type WriteActivityInput = {
  type: ActivityType;
  entityType: ActivityEntityType;
  entityId: string;
  title: string;
  description: string;
  locationName?: string | null;
  roomName?: string | null;
  boxName?: string | null;
  previous?: ActivityPreviousNext;
  next?: ActivityPreviousNext;
};

export type ActivityFeedEvent = {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  location: string;
  room?: string;
  box?: string;
  occurredAt: string;
  entityType: ActivityEntityType;
  entityId: string;
};

type ActivityLogRow = {
  id: string;
  type: string | null;
  meta: unknown;
  created_at: string | null;
};

const ACTIVITY_TYPES: ActivityType[] = ["Created", "Updated", "Moved", "Deleted", "Packed"];

async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;

  const userId = data.user?.id;
  if (!userId) {
    throw new Error("No authenticated user found.");
  }

  return userId;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeActivityType(rawType: string | null): ActivityType {
  if (!rawType) {
    return "Updated";
  }

  return ACTIVITY_TYPES.includes(rawType as ActivityType) ? (rawType as ActivityType) : "Updated";
}

function normalizeEntityType(rawValue: unknown): ActivityEntityType {
  const normalized = readString(rawValue)?.toLowerCase();

  if (normalized === "location" || normalized === "room" || normalized === "box" || normalized === "item") {
    return normalized;
  }

  return "box";
}

function buildMeta(input: WriteActivityInput): Record<string, unknown> {
  const meta: Record<string, unknown> = {
    entityType: input.entityType,
    entityId: input.entityId,
    title: input.title,
    description: input.description,
  };

  const locationName = readString(input.locationName);
  const roomName = readString(input.roomName);
  const boxName = readString(input.boxName);

  if (locationName) {
    meta.locationName = locationName;
  }

  if (roomName) {
    meta.roomName = roomName;
  }

  if (boxName) {
    meta.boxName = boxName;
  }

  if (input.previous && isRecord(input.previous)) {
    meta.previous = input.previous;
  }

  if (input.next && isRecord(input.next)) {
    meta.next = input.next;
  }

  return meta;
}

function readNestedName(meta: Record<string, unknown>, branch: "previous" | "next", key: string): string | null {
  const nested = meta[branch];
  if (!isRecord(nested)) {
    return null;
  }

  return readString(nested[key]);
}

function mapActivityRow(row: ActivityLogRow): ActivityFeedEvent {
  const meta = isRecord(row.meta) ? row.meta : {};
  const type = normalizeActivityType(row.type);
  const entityType = normalizeEntityType(meta.entityType);
  const entityId = readString(meta.entityId) ?? row.id;
  const title = readString(meta.title) ?? `${type} ${entityType}`;
  const description = readString(meta.description) ?? "No additional details.";
  const isLegacyRoomEvent = entityType === "location" && title.toLowerCase().startsWith("room ");
  const location =
    readString(meta.locationName) ??
    readNestedName(meta, "next", "locationName") ??
    readNestedName(meta, "previous", "locationName") ??
    (!isLegacyRoomEvent && entityType === "location" ? readString(meta.roomName) : null) ??
    "Unknown location";
  const room =
    readString(meta.roomName) ??
    readNestedName(meta, "next", "roomName") ??
    readNestedName(meta, "previous", "roomName") ??
    undefined;
  const box = readString(meta.boxName) ?? undefined;

  return {
    id: row.id,
    type,
    title,
    description,
    location,
    room,
    box,
    occurredAt: row.created_at ?? new Date().toISOString(),
    entityType,
    entityId,
  };
}

async function writeActivity(input: WriteActivityInput): Promise<void> {
  const userId = await getCurrentUserId();
  const normalizedEntityId = input.entityId.trim();
  const normalizedTitle = input.title.trim();
  const normalizedDescription = input.description.trim();

  if (!normalizedEntityId) {
    throw new Error("Activity entity id is required.");
  }

  if (!normalizedTitle) {
    throw new Error("Activity title is required.");
  }

  if (!normalizedDescription) {
    throw new Error("Activity description is required.");
  }

  const { error } = await supabase.from("activity_log").insert({
    user_id: userId,
    type: input.type,
    location_id: input.entityType === "location" ? normalizedEntityId : null,
    room_id: input.entityType === "room" ? normalizedEntityId : null,
    box_id: input.entityType === "box" ? normalizedEntityId : null,
    item_id: input.entityType === "item" ? normalizedEntityId : null,
    meta: buildMeta({
      ...input,
      entityId: normalizedEntityId,
      title: normalizedTitle,
      description: normalizedDescription,
    }),
  });

  if (error) {
    throw error;
  }
}

async function writeActivitySafely(input: WriteActivityInput): Promise<void> {
  try {
    await writeActivity(input);
  } catch (error) {
    console.warn(`[activity] Failed to write ${input.type} event.`, error);
  }
}

async function listRecentActivity(limit = 200): Promise<ActivityFeedEvent[]> {
  const userId = await getCurrentUserId();
  const normalizedLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 500) : 200;

  const { data, error } = await supabase
    .from("activity_log")
    .select("id,type,meta,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(normalizedLimit);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row: ActivityLogRow) => mapActivityRow(row));
}

export const activityService = {
  writeActivity,
  writeActivitySafely,
  listRecentActivity,
};
