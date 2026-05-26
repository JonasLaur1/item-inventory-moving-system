import { activityService } from "@/lib/activity.service";
import { supabase } from "@/lib/supabase";

type CollaboratorRow = {
  id: string;
  collaborator_id: string;
  created_at: string;
  profiles: { display_name: string | null }[] | null;
};

export type CollaboratorEntry = {
  id: string;
  collaboratorId: string;
  displayName: string | null;
  addedAt: string;
};

type LookupUserResponse = {
  id: string;
  displayName: string | null;
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

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  return (error as { code?: unknown }).code === "23505";
}

async function assertUserOwnsLocation(locationId: string, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from("locations")
    .select("id,name")
    .eq("id", locationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error("Location not found or you do not own it.");
  }

  return data.name as string;
}

async function listCollaborators(locationId: string): Promise<CollaboratorEntry[]> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("location_collaborators")
    .select("id,collaborator_id,created_at,profiles:collaborator_id(display_name)")
    .eq("location_id", locationId)
    .eq("owner_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row: CollaboratorRow) => ({
    id: row.id,
    collaboratorId: row.collaborator_id,
    displayName: Array.isArray(row.profiles) ? (row.profiles[0]?.display_name ?? null) : null,
    addedAt: row.created_at,
  }));
}

async function addCollaboratorByEmail(locationId: string, email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    throw new Error("A valid email is required.");
  }

  const userId = await getCurrentUserId();
  const locationName = await assertUserOwnsLocation(locationId, userId);

  const { data, error: fnError } = await supabase.functions.invoke<LookupUserResponse>(
    "lookup-user-by-email",
    { body: { email: normalizedEmail } },
  );

  if (fnError) {
    let message: string | undefined;
    try {
      const body = await (fnError as { context?: Response }).context?.json();
      message = (body as { error?: string })?.error;
    } catch {
      // ignore parse errors
    }
    throw new Error(message ?? "Failed to look up user. Please try again later.");
  }

  if (!data) {
    throw new Error("No BoxIt account found for that email.");
  }

  const { error: insertError } = await supabase.from("location_collaborators").insert({
    location_id: locationId,
    owner_id: userId,
    collaborator_id: data.id,
  });

  if (insertError) {
    if (isUniqueViolation(insertError)) {
      throw new Error("This person is already a collaborator on this location.");
    }
    throw insertError;
  }

  await activityService.writeActivitySafely({
    type: "Updated",
    entityType: "location",
    entityId: locationId,
    title: "Collaborator added",
    description: `Added ${data.displayName ?? normalizedEmail} as a collaborator to "${locationName}".`,
    locationName,
  });
}

async function removeCollaborator(locationId: string, collaboratorId: string): Promise<void> {
  const userId = await getCurrentUserId();
  const locationName = await assertUserOwnsLocation(locationId, userId);

  const { data, error } = await supabase
    .from("location_collaborators")
    .delete()
    .eq("location_id", locationId)
    .eq("collaborator_id", collaboratorId)
    .eq("owner_id", userId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error("Collaborator not found.");
  }

  await activityService.writeActivitySafely({
    type: "Updated",
    entityType: "location",
    entityId: locationId,
    title: "Collaborator removed",
    description: `Removed a collaborator from "${locationName}".`,
    locationName,
  });
}

export const collaboratorService = {
  listCollaborators,
  addCollaboratorByEmail,
  removeCollaborator,
};
