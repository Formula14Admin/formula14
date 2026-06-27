import { createClient } from '@supabase/supabase-js'

// The anon key is safe to include in client bundles — security is enforced by RLS.
// Hardcoded fallbacks ensure the client works when NEXT_PUBLIC_ vars are not inlined
// at build time (e.g. a Vercel deployment built before env vars were added).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  || 'https://dydrtbrhhgyppancbhpy.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5ZHJ0YnJoaGd5cHBhbmNiaHB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1MjQzODIsImV4cCI6MjA5ODEwMDM4Mn0.46LZMlaoN_ts2Dsur9ma2lBsMLMaC0wvhN7njrRlcGc'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
