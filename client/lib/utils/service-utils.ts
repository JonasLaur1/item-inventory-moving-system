import { supabase } from "@/lib/supabase";

export async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;

  const userId = data.user?.id;
  if (!userId) {
    throw new Error("No authenticated user found.");
  }

  return userId;
}

export function normalizeFragility(value: string | null): boolean {
  if (!value) {
    return false;
  }

  const normalized = value.toLowerCase();

  if (normalized === "none" || normalized === "normal" || normalized === "not_fragile") {
    return false;
  }

  return normalized.includes("fragile") || normalized === "medium" || normalized === "high";
}

export function resolveUniqueName(baseName: string, existingNames: string[]): string {
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
