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
      autoRefreshToken: true,
      detectSessionInUrl: true,
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

// Create a server-side client for server components and API routes
export function createServerClient() {
  // Check if we have the server-side environment variables
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""

  // Only create the client if we have the required environment variables
  if (supabaseUrl && supabaseServiceKey) {
    return createClient(supabaseUrl, supabaseServiceKey)
  }

  // Return a mock client that won't throw errors
  return {
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: new Error("Server Supabase not initialized") }),
        }),
      }),
    }),
  } as unknown as ReturnType<typeof createClient>
}
