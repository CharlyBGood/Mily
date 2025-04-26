import { v4 as uuidv4 } from "uuid"
import { getSupabaseClient } from "./supabase-client"
import type { Meal } from "./types"

// Interface for share links
export interface ShareLink {
  id: string
  user_id: string
  title: string
  description?: string
  created_at: string
  expires_at?: string | null
  is_password_protected: boolean
  is_active: boolean
}

// Create a new share link
export async function createShareLink(
  title: string,
  description?: string,
  expiresInDays?: number,
  isPasswordProtected = false,
  accessCode?: string,
): Promise<{ success: boolean; data?: ShareLink; error?: any }> {
  try {
    const supabase = getSupabaseClient()

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: { message: "User not authenticated" } }
    }

    let expires_at: string | null = null
    if (expiresInDays) {
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + expiresInDays)
      expires_at = expiryDate.toISOString()
    }

    // Create a new share link
    const shareLink: ShareLink = {
      id: uuidv4(),
      user_id: user.id,
      title,
      description: description || null,
      created_at: new Date().toISOString(),
      expires_at: expires_at,
      is_password_protected: isPasswordProtected,
      is_active: true,
    }

    // Insert the share link into the database
    const { data, error } = await supabase
      .from("share_links")
      .insert([
        {
          id: shareLink.id,
          user_id: shareLink.user_id,
          title: shareLink.title,
          description: shareLink.description,
          created_at: shareLink.created_at,
          expires_at: shareLink.expires_at,
          access_code: isPasswordProtected && accessCode ? accessCode : null,
          is_password_protected: isPasswordProtected,
          is_active: shareLink.is_active,
        },
      ])
      .select()

    if (error) {
      console.error("Error creating share link:", error)
      return { success: false, error }
    }

    return { success: true, data: data ? (data[0] as ShareLink) : shareLink }
  } catch (error) {
    console.error("Error in createShareLink:", error)
    return { success: false, error }
  }
}

// Get all share links for the current user
export async function getUserShareLinks(): Promise<{ success: boolean; data?: ShareLink[]; error?: any }> {
  try {
    const supabase = getSupabaseClient()

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: { message: "User not authenticated" } }
    }

    // Get all share links for the current user
    const { data, error } = await supabase
      .from("share_links")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error getting share links:", error)
      return { success: false, error }
    }

    return { success: true, data: data as ShareLink[] }
  } catch (error) {
    console.error("Error in getUserShareLinks:", error)
    return { success: false, error }
  }
}

// Delete a share link
export async function deleteShareLink(shareLinkId: string): Promise<{ success: boolean; error?: any }> {
  try {
    const supabase = getSupabaseClient()

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: { message: "User not authenticated" } }
    }

    // Delete the share link
    const { error } = await supabase.from("share_links").delete().eq("id", shareLinkId).eq("user_id", user.id)

    if (error) {
      console.error("Error deleting share link:", error)
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in deleteShareLink:", error)
    return { success: false, error }
  }
}

// Verify access code for a share link
export async function verifyAccessCode(
  shareLinkId: string,
  accessCode: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient()

    // Get the share link
    const { data, error } = await supabase
      .from("share_links")
      .select("access_code, is_password_protected")
      .eq("id", shareLinkId)
      .single()

    if (error) {
      console.error("Error getting share link:", error)
      return { success: false, error: "Share link not found" }
    }

    if (!data.is_password_protected) {
      return { success: true }
    }

    if (data.access_code === accessCode) {
      return { success: true }
    } else {
      return { success: false, error: "Invalid access code" }
    }
  } catch (error) {
    console.error("Error in verifyAccessCode:", error)
    return { success: false, error: "An error occurred while verifying the access code" }
  }
}

/**
 * Retrieves meals for a specific user for sharing purposes
 * Uses the optimized Supabase function for efficient data retrieval
 */
export async function getSharedMeals(userId: string): Promise<{ success: boolean; data?: Meal[]; error?: any }> {
  try {
    const supabase = getSupabaseClient()

    // Check if sharing is enabled for this user
    const { data: sharingEnabled, error: sharingError } = await supabase.rpc("is_sharing_enabled", {
      p_user_id: userId,
    })

    if (sharingError || !sharingEnabled) {
      return { success: false, error: "Sharing is not enabled for this user" }
    }

    // Use the optimized function to get meals
    const { data, error } = await supabase.rpc("get_user_meals_for_sharing", {
      p_user_id: userId,
    })

    if (error) {
      console.error("Error getting shared meals:", error)
      return { success: false, error }
    }

    return { success: true, data: data as Meal[] }
  } catch (error) {
    console.error("Error in getSharedMeals:", error)
    return { success: false, error }
  }
}

/**
 * Generates a shareable link for a user's meal history
 */
export function generateShareableLink(userId: string): string {
  // Generate the URL for direct sharing
  return `${typeof window !== "undefined" ? window.location.origin : ""}/share/historialdemilydeuserconId=${userId}`
}

/**
 * Extracts user ID from a shareable link path
 */
export function extractUserIdFromSharePath(path: string): string | null {
  if (!path.startsWith("/share/historialdemilydeuserconId=")) {
    return null
  }

  return path.split("historialdemilydeuserconId=")[1].replace("/", "")
}
