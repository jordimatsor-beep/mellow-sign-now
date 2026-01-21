import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const isNonEmpty = (v: unknown): v is string =>
  typeof v === 'string' && v.trim().length > 0 && v.trim().toLowerCase() !== 'undefined' && v.trim().toLowerCase() !== 'null';

const isValidUrl = (v: string) => {
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
};

export const isSupabaseConfigured = Boolean(
  isNonEmpty(supabaseUrl) && isValidUrl(supabaseUrl) && isNonEmpty(supabaseAnonKey)
);

type DemoError = { message: string };
const demoError = (message: string): DemoError => ({ message });

// Minimal demo client to prevent blank screens when env vars are missing.
// It returns safe values (session/user null) and surfaces a clear error when backend calls are attempted.
const demoSupabase = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: demoError('Supabase is not configured') }),
    getUser: async () => ({ data: { user: null }, error: demoError('Supabase is not configured') }),
    onAuthStateChange: (_cb: unknown) => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),
    signOut: async () => ({ error: null }),
    signUp: async () => ({ data: { user: null, session: null }, error: demoError('Supabase is not configured') }),
    signInWithPassword: async () => ({ data: { user: null, session: null }, error: demoError('Supabase is not configured') }),
    signInWithOAuth: async () => ({ data: null, error: demoError('Supabase is not configured') }),
    updateUser: async () => ({ data: { user: null }, error: demoError('Supabase is not configured') }),
    resetPasswordForEmail: async () => ({ data: null, error: demoError('Supabase is not configured') }),
  },
  functions: {
    invoke: async () => ({ data: null, error: demoError('Supabase is not configured') }),
  },
  // Covers common usage like: await supabase.from('x').select(...).order(...)
  from: () => ({
    select: () => ({
      order: async () => ({ data: [], error: demoError('Supabase is not configured') }),
      eq: () => ({
        single: async () => ({ data: null, error: demoError('Supabase is not configured') }),
      }),
    }),
  }),
  rpc: async () => ({ data: 0, error: demoError('Supabase is not configured') }),
} as const;

export const supabase: SupabaseClient | (typeof demoSupabase) = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : demoSupabase;

if (!isSupabaseConfigured) {
  console.warn('Supabase env vars missing: running in demo mode (no backend).');
}
