import { supabase } from "@/lib/supabase";

export type UserProfile = {
  id: string;
  displayName: string | null;
  email: string | null;
};

async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;

  const userId = data.user?.id;
  if (!userId) throw new Error("Not authenticated");

  return userId;
}

export const profileService = {
  async getProfile(): Promise<UserProfile> {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;

    const user = userData.user;
    if (!user) throw new Error("Not authenticated");

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, display_name")
      .eq("id", user.id)
      .single();

    if (profileError && profileError.code !== "PGRST116") throw profileError;

    return {
      id: user.id,
      displayName: profileData?.display_name ?? null,
      email: user.email ?? null,
    };
  },

  async updateDisplayName(displayName: string): Promise<void> {
    const userId = await getCurrentUserId();

    const { error } = await supabase
      .from("profiles")
      .upsert({ id: userId, display_name: displayName.trim(), updated_at: new Date().toISOString() });

    if (error) throw error;
  },
};
