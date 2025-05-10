import { createClient } from "@supabase/supabase-js"
import type { SupabaseClient } from "@supabase/supabase-js"

// Store a single instance of the Supabase client
let supabaseInstance: SupabaseClient | null = null

// Get the Supabase client (singleton pattern)
export function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL and anon key must be defined")
  }

  // Create a new client if one doesn't exist
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      storageKey: "mily_supabase_auth",
      storage: {
        getItem: (key) => {
          if (typeof window === "undefined") {
            return null
          }
          const value = localStorage.getItem(key)
          return value
        },
        setItem: (key, value) => {
          if (typeof window !== "undefined") {
            localStorage.setItem(key, value)
          }
        },
        removeItem: (key) => {
          if (typeof window !== "undefined") {
            localStorage.removeItem(key)
          }
        },
      },
    },
  })

  return supabaseInstance
}

// Reset the Supabase client (useful for testing or when signing out)
export function resetSupabaseClient(): void {
  supabaseInstance = null
}
