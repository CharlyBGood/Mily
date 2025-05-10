"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { getSupabaseClient, resetSupabaseClient } from "./supabase-client"
import type { Session, User } from "@supabase/supabase-js"

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
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  error: null,
  signIn: async () => ({ success: false, error: new Error("Not implemented") }),
  signUp: async () => ({ success: false, error: new Error("Not implemented") }),
  signOut: async () => {},
  resetPassword: async () => ({ success: false, error: new Error("Not implemented") }),
  updatePassword: async () => ({ success: false, error: new Error("Not implemented") }),
  updateProfile: async () => ({ success: false, error: new Error("Not implemented") }),
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [initialized, setInitialized] = useState(false)

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log("Initializing auth context")
        const supabase = getSupabaseClient()

        // Get initial session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

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

        // Set up auth state change listener
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          console.log("Auth state changed:", event, newSession?.user?.id)

          if (newSession) {
            setSession(newSession)
            setUser(newSession.user)
          } else {
            setSession(null)
            setUser(null)
          }

          setLoading(false)
        })

        setInitialized(true)
        setLoading(false)

        // Clean up subscription
        return () => {
          authListener.subscription.unsubscribe()
        }
      } catch (err) {
        console.error("Error in auth initialization:", err)
        setError(err instanceof Error ? err : new Error(String(err)))
        setLoading(false)
      }
    }

    initAuth()
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
      await supabase.auth.signOut({ scope: "local" }) // Only sign out locally

      // Clear state
      setSession(null)
      setUser(null)

      // Reset the Supabase client to ensure a clean state
      resetSupabaseClient()

      // Clear any local storage related to auth
      if (typeof window !== "undefined") {
        localStorage.removeItem("mily_supabase_auth")
      }
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

      const supabase = getSupabaseClient()
      const { data, error } = await supabase.from("profiles").upsert(
        [
          {
            id: user?.id,
            ...fields,
          },
        ],
        { returning: "minimal" },
      )

      if (error) {
        console.error("Update profile error:", error)
        setError(error)
        return { success: false, error }
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

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading: loading && !initialized,
        error,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export type { AuthContextType }
