import { createClient } from "@supabase/supabase-js"

// Create a singleton pattern for the Supabase client
let supabaseInstance: ReturnType<typeof createClient> | null = null

// Update the getSupabaseClient function to implement proper singleton pattern
export const getSupabaseClient = () => {
  // If we already have an instance, return it
  if (supabaseInstance) return supabaseInstance

  // Get environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

  // Only create the client if we have the required environment variables
  if (supabaseUrl && supabaseAnonKey) {
    // Create a single instance with proper auth configuration
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "mily-auth-token",
      },
    })
    return supabaseInstance
  }

  // Return a mock client for SSR that won't throw errors
  return {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: () => Promise.resolve({ data: null, error: new Error("Supabase not initialized") }),
      signUp: () => Promise.resolve({ data: null, error: new Error("Supabase not initialized") }),
      signOut: () => Promise.resolve({ error: null }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: new Error("Supabase not initialized") }),
        }),
      }),
    }),
  } as unknown as ReturnType<typeof createClient>
}

// For backward compatibility - use the singleton getter
export const supabase = getSupabaseClient()

// Create a server-side client for server components and API routes
export const createServerClient = () => {
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
