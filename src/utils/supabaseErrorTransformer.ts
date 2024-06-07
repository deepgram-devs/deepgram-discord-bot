import { PostgrestError } from "@supabase/supabase-js";

/**
 *
 * @param {PostgrestError} error Error from supabase.
 * @returns {string} String representation of error message with code.
 */
export const supabaseErrorTransformer = (error: PostgrestError) => {
  const { code, message } = error;

  return `Code: ${code}. Message: ${message}`;
};
