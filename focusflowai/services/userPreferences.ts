// services/userPreferences.ts
import { supabase } from '@/lib/supabaseClient';

export const getUserPreferences = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('preferences')
      .eq('user_id', userId)
      .single(); // Assuming one row per user

    if (error) throw error;
    return data?.preferences || null;
  } catch (err: any) {
    console.error('Error fetching user preferences:', err.message);
    return null;
  }
};
