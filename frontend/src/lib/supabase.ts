import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function createSupabaseClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    const placeholder = "https://placeholder.supabase.co";
    const placeholderKey =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.placeholder";
    console.warn(
      "Supabase env vars not set (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). " +
        "Real-time drawing features will not work. " +
        "Copy .env.template to frontend/.env and fill in your Supabase credentials.",
    );
    return createClient(placeholder, placeholderKey);
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = createSupabaseClient();
