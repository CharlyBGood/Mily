import { v4 as uuidv4 } from "uuid"
import { getSupabaseClient } from "./supabase-client"

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

export async function createShareLink(
  title: string,
  mealIds: string[], // Nuevo parámetro para IDs de comidas
  description?: string,
  expiresInDays?: number,
  isPasswordProtected = false,
  accessCode?: string,
): Promise<{ success: boolean; data?: ShareLink; error?: any }> {
  try {
    const supabase = getSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: { message: "User not authenticated" } }
    }

    // Crear fecha de expiración en UTC
    const expires_at = expiresInDays ? new Date(Date.now() + expiresInDays * 86400000).toISOString() : null

    const shareLink: ShareLink = {
      id: uuidv4(),
      user_id: user.id,
      title,
      description: description || null,
      created_at: new Date().toISOString(),
      expires_at,
      is_password_protected: isPasswordProtected,
      is_active: true,
    }

    // Crear transacción para operaciones relacionadas
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

    if (error) throw error

    // Vincular comidas al enlace en la tabla de relación
    if (mealIds.length > 0) {
      const { error: relationError } = await supabase.from("share_link_meals").insert(
        mealIds.map((meal_id) => ({
          share_link_id: shareLink.id,
          meal_id,
        })),
      )

      if (relationError) throw relationError
    }

    return { success: true, data: data[0] as ShareLink }
  } catch (error) {
    console.error("Error in createShareLink:", error)
    return { success: false, error }
  }
}

export async function getSharedMeals(shareLinkId: string): Promise<{ success: boolean; data?: any; error?: any }> {
  try {
    const supabase = getSupabaseClient()
    const nowUTC = new Date().toISOString()

    // Verificar enlace y estado
    const { data: shareLink, error: linkError } = await supabase
      .from("share_links")
      .select("is_active, expires_at")
      .eq("id", shareLinkId)
      .single()

    if (linkError || !shareLink) {
      return { success: false, error: { message: "Enlace no encontrado" } }
    }

    if (!shareLink.is_active || (shareLink.expires_at && shareLink.expires_at < nowUTC)) {
      return { success: false, error: { message: "Enlace no válido o expirado" } }
    }

    // Obtener comidas vinculadas mediante la tabla de relación
    const { data: meals, error: mealsError } = await supabase
      .from("meals")
      .select(`
        *,
        share_link_meals!inner(
          share_link_id
        )
      `)
      .eq("share_link_meals.share_link_id", shareLinkId)

    if (mealsError) throw mealsError

    return { success: true, data: meals }
  } catch (error) {
    console.error("Error in getSharedMeals:", error)
    return { success: false, error }
  }
}

// Add the missing functions after the getSharedMeals function

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

    // First delete related entries in share_link_meals
    const { error: relationError } = await supabase.from("share_link_meals").delete().eq("share_link_id", shareLinkId)

    if (relationError) {
      console.error("Error deleting share link meals:", relationError)
      return { success: false, error: relationError }
    }

    // Then delete the share link
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

// Add verifyAccessCode function if it's missing
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
