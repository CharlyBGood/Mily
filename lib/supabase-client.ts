import { createClient } from "@supabase/supabase-js"

// Create a singleton pattern for the Supabase client
let supabaseInstance: ReturnType<typeof createClient> | null = null

// Update the getSupabaseClient function to only use the correct environment variable names
export const getSupabaseClient = () => {
  if (supabaseInstance) return supabaseInstance

  // Check if we're in a browser environment
  const isBrowser = typeof window !== "undefined"

  // Get environment variables - use the correct names with single underscore
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

  // Only create the client if we have the required environment variables
  if (supabaseUrl && supabaseAnonKey) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey)
    return supabaseInstance
  }

  // Environment variables should be set, but provide a fallback just in case
  if (isBrowser && (!supabaseUrl || !supabaseAnonKey)) {
    // Silent fallback
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
          order: () => Promise.resolve({ data: null, error: new Error("Supabase not initialized") }),
        }),
        order: () => Promise.resolve({ data: null, error: new Error("Supabase not initialized") }),
      }),
      insert: () => Promise.resolve({ data: null, error: new Error("Supabase not initialized") }),
      update: () => ({
        eq: () => Promise.resolve({ data: null, error: new Error("Supabase not initialized") }),
      }),
      delete: () => ({
        eq: () => Promise.resolve({ data: null, error: new Error("Supabase not initialized") }),
      }),
    }),
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: null, error: new Error("Supabase not initialized") }),
        getPublicUrl: () => ({ data: { publicUrl: "" } }),
      }),
      listBuckets: () => Promise.resolve({ data: [], error: null }),
      createBucket: () => Promise.resolve({ data: null, error: null }),
    },
  } as unknown as ReturnType<typeof createClient>
}

// For backward compatibility
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
