import { v4 as uuidv4 } from "uuid"
import { getSupabaseClient } from "./supabase-client"

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

// Get shared meals for a specific share link
export async function getSharedMeals(shareLinkId: string): Promise<{ success: boolean; data?: any; error?: any }> {
  try {
    const supabase = getSupabaseClient()

    // Get the share link
    const { data: shareLink, error: linkError } = await supabase
      .from("share_links")
      .select("user_id, is_active, expires_at")
      .eq("id", shareLinkId)
      .single()

    if (linkError) {
      console.error("Error getting share link:", linkError)
      return { success: false, error: { message: "Share link not found" } }
    }

    // Check if the link is active and not expired
    if (!shareLink.is_active) {
      return { success: false, error: { message: "Share link is not active" } }
    }

    if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
      return { success: false, error: { message: "Share link has expired" } }
    }

    // Get the meals for the user who created the share link
    const { data: meals, error: mealsError } = await supabase
      .from("meals")
      .select("*")
      .eq("user_id", shareLink.user_id)
      .order("created_at", { ascending: false })

    if (mealsError) {
      console.error("Error getting meals:", mealsError)
      return { success: false, error: mealsError }
    }

    return { success: true, data: meals }
  } catch (error) {
    console.error("Error in getSharedMeals:", error)
    return { success: false, error }
  }
}
