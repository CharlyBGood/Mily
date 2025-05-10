import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

// Create a custom storage object that persists auth state
const createCustomStorage = () => {
  const storageKey = "mily_supabase_auth"

  return {
    getItem: (key: string) => {
      if (typeof window === "undefined") {
        return null
      }

      const storedValue = localStorage.getItem(storageKey)
      if (!storedValue) return null

      try {
        const parsed = JSON.parse(storedValue)
        return parsed[key]
      } catch (error) {
        console.error("Error parsing stored auth:", error)
        return null
      }
    },
    setItem: (key: string, value: string) => {
      if (typeof window === "undefined") {
        return
      }

      let storedValue = {}
      const existing = localStorage.getItem(storageKey)

      if (existing) {
        try {
          storedValue = JSON.parse(existing)
        } catch (error) {
          console.error("Error parsing stored auth:", error)
        }
      }

      localStorage.setItem(
        storageKey,
        JSON.stringify({
          ...storedValue,
          [key]: value,
        }),
      )
    },
    removeItem: (key: string) => {
      if (typeof window === "undefined") {
        return
      }

      const existing = localStorage.getItem(storageKey)
      if (!existing) return

      try {
        const parsed = JSON.parse(existing)
        delete parsed[key]

        if (Object.keys(parsed).length === 0) {
          localStorage.removeItem(storageKey)
        } else {
          localStorage.setItem(storageKey, JSON.stringify(parsed))
        }
      } catch (error) {
        console.error("Error removing item from stored auth:", error)
      }
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
    },
  })

  return supabaseClient
}

export function resetSupabaseClient() {
  supabaseClient = null
}
