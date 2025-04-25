"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import type { Session, User } from "@supabase/supabase-js"
import { getSupabaseClient } from "./supabase-client"

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

type AuthContextType = {
  user: User | null
  session: Session | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: any; data?: any }>
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: any }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ success: boolean; error?: any }>
  updatePassword: (password: string) => Promise<{ success: boolean; error?: any }>
  updateProfile: (profile: Partial<UserProfile>) => Promise<{ success: boolean; error?: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isBrowser, setIsBrowser] = useState(false)

  useEffect(() => {
    setIsBrowser(true)
  }, [])

  useEffect(() => {
    // Only run on the client side
    if (!isBrowser) return

    const supabase = getSupabaseClient()

    // Get initial session
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        setSession(session)
        setUser(session?.user ?? null)
      } catch (error) {
        console.error("Error getting initial session:", error)
      } finally {
        setIsLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [isBrowser])

  const signIn = async (email: string, password: string) => {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        console.error("Sign in error:", error)
        return { success: false, error }
      }

      return { success: true, data }
    } catch (error) {
      console.error("Sign in exception:", error)
      return { success: false, error }
    }
  }

  const signUp = async (email: string, password: string) => {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.auth.signUp({ email, password })

      if (error) {
        return { success: false, error }
      }

      // Create a profile record for the new user
      if (data.user) {
        const { error: profileError } = await supabase.from("profiles").insert({
          id: data.user.id,
          email: data.user.email,
        })

        if (profileError) {
          console.error("Error creating profile:", profileError)
        }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error }
    }
  }

  const signOut = async () => {
    const supabase = getSupabaseClient()
    await supabase.auth.signOut()
  }

  const resetPassword = async (email: string) => {
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        return { success: false, error }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error }
    }
  }

  const updatePassword = async (password: string) => {
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        return { success: false, error }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error }
    }
  }

  const updateProfile = async (profile: Partial<UserProfile>) => {
    try {
      if (!user) {
        return { success: false, error: "No user logged in" }
      }

      const supabase = getSupabaseClient()
      const { error } = await supabase.from("profiles").update(profile).eq("id", user.id)

      if (error) {
        return { success: false, error }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error }
    }
  }

  const value = {
    user,
    session,
    isLoading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
