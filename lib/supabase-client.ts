import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

// Create a custom storage object that persists auth state
const createCustomStorage = () => {
  return {
    getItem: (key: string) => {
      if (typeof window === "undefined") {
        return null
      }
      return localStorage.getItem(key)
    },
    setItem: (key: string, value: string) => {
      if (typeof window === "undefined") {
        return
      }
      localStorage.setItem(key, value)
    },
    removeItem: (key: string) => {
      if (typeof window === "undefined") {
        return
      }
      localStorage.removeItem(key)
    },
  }
}

// Singleton pattern to ensure we only create one client
let supabaseClient: ReturnType<typeof createClient> | null = null

export function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables")
  }

  supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: createCustomStorage(),
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })

  return supabaseClient
}

export function resetSupabaseClient(): void {
  supabaseClient = null
}
