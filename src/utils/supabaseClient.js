import { createClient } from '@supabase/supabase-js';

// Supabase credentials loaded securely from environment variables (see .env / .env.example)
// Never hardcode credentials in frontend source files to prevent repository leakage
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  if (import.meta.env.DEV) {
    console.warn(
      '[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment. Cloud sync features may be inactive.'
    );
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
