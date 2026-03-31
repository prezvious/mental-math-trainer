import { createClient } from '@supabase/supabase-js';

let cachedClient;

const DEFAULT_SUPABASE_URL = 'https://srpblpxdrscahmttekod.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNycGJscHhkcnNjYWhtdHRla29kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzODI4MjQsImV4cCI6MjA4ODk1ODgyNH0.hxeRwWc69jZHHVgi3bmYwqaGxZI0qmQx5OgG77UUNWQ';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabaseClientKey =
  supabaseAnonKey || supabasePublishableKey || DEFAULT_SUPABASE_ANON_KEY;

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
  if (!isSupabaseConfigured()) {
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
