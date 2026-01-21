// Single source of truth for the Supabase client used across the app.
// IMPORTANT: Lovable projects should not rely on VITE_* runtime env vars in client code.
// The Supabase URL + anon key are defined in src/integrations/supabase/client.ts.

import { supabase } from "@/integrations/supabase/client";

// Kept for compatibility with any UI that may want to show a "backend configured" state.
export const isSupabaseConfigured = true;

export { supabase };
