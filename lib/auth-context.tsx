"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { getSupabaseClient, resetSupabaseClient } from "./supabase-client"
import type { Session, User } from "@supabase/supabase-js"
import { useRouter, usePathname } from "next/navigation";


export interface UserProfile {
  id: string
  email: string
  username?: string | null
  full_name?: string | null
  avatar_url?: string | null
  bio?: string | null
  website?: string | null
  created_at?: string
  updated_at?: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  error: Error | null
  signIn: (email: string, password: string) => Promise<{ success: boolean; error: Error | null }>
  signUp: (email: string, password: string) => Promise<{ success: boolean; error: Error | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ success: boolean; error: Error | null }>
  updatePassword: (password: string) => Promise<{ success: boolean; error: Error | null }>
  updateProfile: (fields: {
    username?: string | null
    full_name?: string | null
    bio?: string | null
    website?: string | null
    avatar_url?: string | null
  }) => Promise<{ success: boolean; error: Error | null }>
  refreshSession: () => Promise<void>
  ensureDbSetup: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  error: null,
  signIn: async () => ({ success: false, error: new Error("Not implemented") }),
  signUp: async () => ({ success: false, error: new Error("Not implemented") }),
  signOut: async () => { },
  resetPassword: async () => ({ success: false, error: new Error("Not implemented") }),
  updatePassword: async () => ({ success: false, error: new Error("Not implemented") }),
  updateProfile: async () => ({ success: false, error: new Error("Not implemented") }),
  refreshSession: async () => { },
  ensureDbSetup: async () => false,
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [firstSessionChecked, setFirstSessionChecked] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const PUBLIC_PATHS = ["/login", "/register", "/forgot-password"];
    if (!loading && user && PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
      router.replace("/");
    }
  }, [user, loading, pathname, router]);


  // Function to refresh the session
  const refreshSession = useCallback(async () => {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.auth.refreshSession()

      if (error) {
        console.error("Error refreshing session:", error)
        return
      }

      if (data.session) {
        setSession(data.session)
        setUser(data.session.user)
      }
    } catch (err) {
      console.error("Error in refreshSession:", err)
    }
  }, [])

  // Function to ensure database tables are set up
  const ensureDbSetup = useCallback(async () => {
    if (!user) return false

    try {
      const supabase = getSupabaseClient()

      // Check if profiles table exists and has a record for this user
      try {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle()

        // Si no existe, crearlo con username por defecto
        if (profileError || !profileData) {
          const usernameDefault = user.email?.split("@")[0] || ""
          const { error: insertError } = await supabase.from("profiles").upsert({
            id: user.id,
            email: user.email || "",
            username: usernameDefault,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: "id" })

          if (insertError && !insertError.message.includes("duplicate key")) {
            console.error("Error creating profile:", insertError)
            return false
          }
        }
      } catch (error) {
        console.error("Error checking profiles:", error)
      }

      // Check if user_settings table exists and has a record for this user
      try {
        const { data: settingsData, error: settingsError } = await supabase
          .from("user_settings")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle()

        // Si no existe, crearlo con username por defecto y settings default
        if (settingsError || !settingsData) {
          const usernameDefault = user.email?.split("@")[0] || ""
          const { error: insertError } = await supabase.from("user_settings").upsert({
            user_id: user.id,
            username: usernameDefault,
            cycle_duration: 7,
            cycle_start_day: 1,
            sweet_dessert_limit: 3,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })

          if (insertError && !insertError.message.includes("duplicate key")) {
            console.error("Error creating user settings:", insertError)
            return false
          }
        }
      } catch (error) {
        console.error("Error checking user_settings:", error)
      }

      return true
    } catch (error) {
      console.error("Error in ensureDbSetup:", error)
      return false
    }
  }, [user])

  // Initialize auth state
  useEffect(() => {
    let authListener: { subscription: { unsubscribe: () => void } } | null = null;
    let isMounted = true;

    const initAuth = async () => {
      try {
        console.log("Initializing auth context")
        const supabase = getSupabaseClient()

        // Get initial session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

        if (!isMounted) return;

        if (sessionError) {
          console.error("Error getting session:", sessionError)
          setError(sessionError)
        } else if (sessionData?.session) {
          console.log("Session found:", sessionData.session.user.id)
          setSession(sessionData.session)
          setUser(sessionData.session.user)
        } else {
          console.log("No session found")
        }

        setFirstSessionChecked(true)

        // Set up auth state change listener only once
        authListener = supabase.auth.onAuthStateChange(async (event, newSession) => {
          console.log("Auth state changed:", event, newSession?.user?.id)

          if (!isMounted) return;

          setSession(prevSession => {

            if (!prevSession && newSession || prevSession && newSession && prevSession.access_token !== newSession.access_token) {
              setUser(newSession?.user || null);
              return newSession;
            }
            return prevSession;
          })

          if (!newSession) {
            return setUser(null);
          }

          setLoading(false);

          if (newSession) {
            setSession(newSession)
            setUser(newSession.user)
          } else {
            setSession(null)
            setUser(null)
          }

          setLoading(false)
        }).data;
      } catch (err) {
        console.error("Error in auth initialization:", err)
        setError(err instanceof Error ? err : new Error(String(err)))
        setLoading(false)
      }
    }

    initAuth()

    return () => {
      isMounted = false;
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    }
  }, [])

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      setError(null)

      const supabase = getSupabaseClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error("Sign in error:", error)
        setError(error)
        return { success: false, error }
      }

      console.log("Sign in successful:", data.user?.id)
      setSession(data.session)
      setUser(data.user)

      return { success: true, error: null }
    } catch (err) {
      console.error("Error in signIn:", err)
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      return { success: false, error }
    } finally {
      setLoading(false)
    }
  }

  // Sign up with email and password
  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true)
      setError(null)

      const supabase = getSupabaseClient()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        console.error("Sign up error:", error)
        setError(error)
        return { success: false, error }
      }

      console.log("Sign up successful:", data)

      // Note: For email confirmation flow, user won't be signed in immediately
      if (data.session) {
        setSession(data.session)
        setUser(data.user)
      }

      return { success: true, error: null }
    } catch (err) {
      console.error("Error in signUp:", err)
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      return { success: false, error }
    } finally {
      setLoading(false)
    }
  }

  // Sign out
  const signOut = async () => {
    try {
      setLoading(true)
      const supabase = getSupabaseClient()
      await supabase.auth.signOut({ scope: "local" })

      // Clear state
      setSession(null)
      setUser(null)

      // Reset the Supabase client to ensure a clean state
      resetSupabaseClient()
    } catch (err) {
      console.error("Error in signOut:", err)
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
    }
  }

  // Reset password
  const resetPassword = async (email: string) => {
    try {
      setLoading(true)
      setError(null)

      const supabase = getSupabaseClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        console.error("Password reset error:", error)
        setError(error)
        return { success: false, error }
      }

      console.log("Password reset email sent to:", email)
      return { success: true, error: null }
    } catch (err) {
      console.error("Error in resetPassword:", err)
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      return { success: false, error }
    } finally {
      setLoading(false)
    }
  }

  // Update password
  const updatePassword = async (password: string) => {
    try {
      setLoading(true)
      setError(null)

      const supabase = getSupabaseClient()
      const { data, error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) {
        console.error("Update password error:", error)
        setError(error)
        return { success: false, error }
      }

      console.log("Password updated successfully")
      return { success: true, error: null }
    } catch (err) {
      console.error("Error in updatePassword:", err)
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      return { success: false, error }
    } finally {
      setLoading(false)
    }
  }

  // Update profile
  const updateProfile = async (fields: {
    username?: string | null
    full_name?: string | null
    bio?: string | null
    website?: string | null
    avatar_url?: string | null
  }) => {
    try {
      setLoading(true)
      setError(null)

      if (!user) {
        throw new Error("No user logged in")
      }

      const supabase = getSupabaseClient()

      // Ensure database is set up
      const isDbSetup = await ensureDbSetup()
      if (!isDbSetup) {
        throw new Error("Database setup failed")
      }

      // Update profiles table
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          email: user.email || "",
          ...fields,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      )

      if (profileError) {
        console.error("Update profile error:", profileError)
        setError(profileError)
        return { success: false, error: profileError }
      }

      // Update username in user_settings if provided
      if (fields.username) {
        const { error: settingsError } = await supabase
          .from("user_settings")
          .update({ username: fields.username, updated_at: new Date().toISOString() })
          .eq("user_id", user.id)

        if (settingsError) {
          console.error("Update user_settings error:", settingsError)
          // Continue anyway, the main profile was updated
        }
      }

      console.log("Profile updated successfully")
      return { success: true, error: null }
    } catch (err) {
      console.error("Error in updateProfile:", err)
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      return { success: false, error }
    } finally {
      setLoading(false)
    }
  }

  // Cambia loading a false solo cuando la sesión inicial fue chequeada
  const contextValue = {
    user,
    session,
    loading: loading || !firstSessionChecked,
    error,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    refreshSession,
    ensureDbSetup,
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export type { AuthContextType }
