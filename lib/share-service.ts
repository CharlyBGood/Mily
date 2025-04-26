import { getSupabaseClient } from "./supabase-client"
import type { Meal } from "./types"

// Interface for share links
export interface ShareLink {
  id: number
  short_id: string
  user_id: string
  created_at: string
  expires_at?: string | null
  is_active: boolean
}

/**
 * Creates a new share link for the current user
 * @param expiresInDays Optional number of days until the link expires
 * @returns Object containing success status and the short ID if successful
 */
export async function createShareLink(
  expiresInDays?: number,
): Promise<{ success: boolean; shortId?: string; error?: any }> {
  try {
    const supabase = getSupabaseClient()

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: { message: "User not authenticated" } }
    }

    // Call the Supabase function to create a share link
    const { data, error } = await supabase.rpc("create_share_link", {
      p_user_id: user.id,
      p_expires_in_days: expiresInDays || null,
    })

    if (error) {
      console.error("Error creating share link:", error)
      return { success: false, error }
    }

    return { success: true, shortId: data }
  } catch (error) {
    console.error("Error in createShareLink:", error)
    return { success: false, error }
  }
}

/**
 * Gets all share links for the current user
 */
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

/**
 * Deletes a share link
 * @param shortId The short ID of the share link to delete
 */
export async function deleteShareLink(shortId: string): Promise<{ success: boolean; error?: any }> {
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
    const { error } = await supabase.from("share_links").delete().eq("short_id", shortId).eq("user_id", user.id)

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

/**
 * Gets the user ID associated with a share link
 * @param shortId The short ID of the share link
 */
export async function getUserIdFromShareLink(
  shortId: string,
): Promise<{ success: boolean; userId?: string; error?: any }> {
  try {
    const supabase = getSupabaseClient()

    // Call the Supabase function to get the user ID
    const { data, error } = await supabase.rpc("get_user_id_from_share_link", {
      p_short_id: shortId,
    })

    if (error) {
      console.error("Error getting user ID from share link:", error)
      return { success: false, error }
    }

    if (!data) {
      return { success: false, error: { message: "Share link not found or expired" } }
    }

    return { success: true, userId: data }
  } catch (error) {
    console.error("Error in getUserIdFromShareLink:", error)
    return { success: false, error }
  }
}

/**
 * Gets shared meals for a specific share link
 * @param shortId The short ID of the share link
 */
export async function getSharedMeals(shortId: string): Promise<{ success: boolean; data?: Meal[]; error?: any }> {
  try {
    // First, get the user ID associated with this share link
    const { success, userId, error: userIdError } = await getUserIdFromShareLink(shortId)

    if (!success || !userId) {
      return { success: false, error: userIdError || { message: "Invalid share link" } }
    }

    const supabase = getSupabaseClient()

    // Get the meals for the user
    const { data, error } = await supabase
      .from("meals")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

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
 * Generates a shareable link with a clean URL
 * @param shortId The short ID for the share link
 */
export function generateShareableLink(shortId: string): string {
  return `${typeof window !== "undefined" ? window.location.origin : ""}/share/${shortId}`
}
