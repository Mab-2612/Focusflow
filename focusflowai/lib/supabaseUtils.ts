// lib/supabaseUtils.ts
"use client";

import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
);

// Types for structured data
export interface UserPreferences {
  theme?: string;
  notifications?: boolean;
  [key: string]: any; // Extendable for any extra prefs
}

/**
 * Fetch user preferences from Supabase
 * @param userId string - The authenticated user's ID
 * @returns UserPreferences | null
 */
export const getUserPreferences = async (userId: string): Promise<UserPreferences | null> => {
  try {
    const { data, error } = await supabase
      .from("user_preferences")
      .select("preferences")
      .eq("user_id", userId)
      .single(); // Use .single() if only one row per user

    if (error) {
      console.error("Supabase fetch error:", error);
      return null;
    }

    return data?.preferences || null;
  } catch (err) {
    console.error("Unexpected error fetching preferences:", err);
    return null;
  }
};

/**
 * Update user preferences in Supabase
 * @param userId string - The authenticated user's ID
 * @param prefs UserPreferences - New preferences to save
 * @returns boolean - Success status
 */
export const updateUserPreferences = async (
  userId: string,
  prefs: UserPreferences
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("user_preferences")
      .upsert({ user_id: userId, preferences: prefs }, { onConflict: "user_id" });

    if (error) {
      console.error("Supabase update error:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Unexpected error updating preferences:", err);
    return false;
  }
};

/**
 * Example helper to structure preferences response
 * Can add default values, formatting, etc.
 */
export const formatPreferences = (prefs: UserPreferences | null) => {
  return {
    theme: prefs?.theme || "light",
    notifications: prefs?.notifications ?? true,
    ...prefs, // Keep extra keys
  };
};
