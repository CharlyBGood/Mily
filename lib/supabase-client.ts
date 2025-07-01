import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

// Singleton pattern to ensure we only create one client
import type { SupabaseClient } from "@supabase/supabase-js"

let supabaseClient: SupabaseClient<Database> | null = null
let lastUrl: string | null = null
let lastKey: string | null = null

export function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If env vars changed (hot reload), reset client
  if (
    supabaseClient &&
    supabaseUrl === lastUrl &&
    supabaseAnonKey === lastKey
  ) {
    return supabaseClient
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables")
  }

  supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
  lastUrl = supabaseUrl
  lastKey = supabaseAnonKey

  return supabaseClient
}

export function resetSupabaseClient(): void {
  supabaseClient = null
  lastUrl = null
  lastKey = null
}
