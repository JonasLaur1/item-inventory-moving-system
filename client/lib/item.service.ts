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

async function assertUserOwnsBox(boxId: string, userId: string): Promise<void> {
  const { data, error } = await supabase
    .from("boxes")
    .select("id")
    .eq("id", boxId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error("Box not found.");
  }
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

  await assertUserOwnsBox(boxId, userId);

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

  await assertUserOwnsBox(boxId, userId);

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
}

async function deleteItem(itemId: string): Promise<void> {
  const normalizedItemId = itemId.trim();
  if (!normalizedItemId) {
    throw new Error("Item id is required.");
  }

  const userId = await getCurrentUserId();

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
}

export const itemService = {
  listItemsByBox,
  createItem,
  updateItem,
  deleteItem,
};
