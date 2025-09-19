// /lib/supabaseUtils.ts
export const handleSupabaseError = (error: any, context: string) => {
  console.error(`Supabase Error (${context}):`, error);
  
  if (error.code) {
    console.error('Error code:', error.code);
  }
  if (error.message) {
    console.error('Error message:', error.message);
  }
  if (error.details) {
    console.error('Error details:', error.details);
  }
  if (error.hint) {
    console.error('Error hint:', error.hint);
  }
  
  return null;
};

export const formatDateForSupabase = (date: Date): string => {
  return date.toISOString().replace('T', ' ').replace('Z', '');
};