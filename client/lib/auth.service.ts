import { supabase } from "./supabase";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

type AuthStateChangeCallback = (
  event: AuthChangeEvent,
  session: Session | null,
) => void | Promise<void>;

export const authService = {
  async signUp(username: string, email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    console.log(data);
    if (error) throw error;
    return data;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    console.log(data);
    if (error) throw error;
    return data;
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /*------------------------------------------------ 
  KOL KAS NEVEIKIA SUTAISYTI VELIAU */

  async remindPassword(email: string, redirectTo: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) throw error;
  },

  async setRecoverySession(accessToken: string, refreshToken: string) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
  },

  async updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  },

  /*------------------------------------------------*/

  onAuthStateChange(callback: AuthStateChangeCallback) {
    return supabase.auth.onAuthStateChange((event, session) =>
      callback(event, session),
    );
  },
};
