import { createClient } from '@supabase/supabase-js';

let cachedClient;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseClientKey = supabaseAnonKey;

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseClientKey);
}

export function getSupabaseRestConfig() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  return {
    url: supabaseUrl,
    key: supabaseClientKey
  };
}

export function getSupabaseClient() {
  if (!isSupabaseConfigured() || typeof window === 'undefined') {
    return null;
  }

  if (!cachedClient) {
    cachedClient = createClient(supabaseUrl, supabaseClientKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }

  return cachedClient;
}
