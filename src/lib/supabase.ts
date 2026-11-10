import { createClient } from '@supabase/supabase-js'

const normalizeEnvValue = (value: string | undefined) => (value ?? '').trim()

export const SUPABASE_URL = normalizeEnvValue(import.meta.env.VITE_SUPABASE_URL)
export const SUPABASE_ANON_KEY = normalizeEnvValue(
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)

export const isDemoMode =
  !SUPABASE_URL ||
  !SUPABASE_ANON_KEY ||
  SUPABASE_URL.includes('<project>') ||
  SUPABASE_ANON_KEY.includes('<anon')

export const db = isDemoMode
  ? null
  : createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    })
