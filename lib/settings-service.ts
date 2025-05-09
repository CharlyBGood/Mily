import { getSupabaseClient } from "./supabase-client"
import type { UserCycleSettings } from "./types"

// Default settings
export const DEFAULT_SETTINGS: UserCycleSettings = {
  cycleDuration: 7,
  cycleStartDay: 1, // Monday
  sweetDessertLimit: 3,
}

// Get user settings from Supabase
export async function getUserSettings(userId: string): Promise<UserCycleSettings> {
  try {
    const supabase = getSupabaseClient()

    // First, check if the user_settings table exists
    const { data: tableExists, error: tableCheckError } = await supabase
      .rpc("check_table_exists", { table_name: "user_settings" })
      .single()

    if (tableCheckError || !tableExists) {
      console.warn("user_settings table does not exist, returning default settings")
      return { ...DEFAULT_SETTINGS }
    }

    // Check if cycle_start_day column exists
    const { data: columnExists, error: columnCheckError } = await supabase
      .rpc("check_column_exists", { table_name: "user_settings", column_name: "cycle_start_day" })
      .single()

    if (columnCheckError || !columnExists) {
      console.warn("cycle_start_day column does not exist, returning default settings")
      // Try to get other settings without cycle_start_day
      const { data, error } = await supabase
        .from("user_settings")
        .select("cycle_duration, sweet_dessert_limit")
        .eq("user_id", userId)
        .single()

      if (error) {
        console.error("Error fetching user settings:", error)
        return { ...DEFAULT_SETTINGS }
      }

      return {
        cycleDuration: data.cycle_duration || DEFAULT_SETTINGS.cycleDuration,
        cycleStartDay: DEFAULT_SETTINGS.cycleStartDay, // Use default since column doesn't exist
        sweetDessertLimit: data.sweet_dessert_limit || DEFAULT_SETTINGS.sweetDessertLimit,
      }
    }

    // If table and column exist, get all settings
    const { data, error } = await supabase
      .from("user_settings")
      .select("cycle_duration, cycle_start_day, sweet_dessert_limit")
      .eq("user_id", userId)
      .single()

    if (error) {
      console.error("Error fetching user settings:", error)

      // If the error is that no rows were returned, create default settings
      if (error.code === "PGRST116") {
        return await createDefaultUserSettings(userId)
      }

      // For other errors, return default settings but don't save them
      return { ...DEFAULT_SETTINGS }
    }

    return {
      cycleDuration: data.cycle_duration || DEFAULT_SETTINGS.cycleDuration,
      cycleStartDay: data.cycle_start_day !== undefined ? data.cycle_start_day : DEFAULT_SETTINGS.cycleStartDay,
      sweetDessertLimit: data.sweet_dessert_limit || DEFAULT_SETTINGS.sweetDessertLimit,
    }
  } catch (error) {
    console.error("Exception in getUserSettings:", error)
    return { ...DEFAULT_SETTINGS }
  }
}

// Create default settings for a new user
async function createDefaultUserSettings(userId: string): Promise<UserCycleSettings> {
  try {
    const supabase = getSupabaseClient()

    // Check if cycle_start_day column exists before inserting
    const { data: columnExists, error: columnCheckError } = await supabase
      .rpc("check_column_exists", { table_name: "user_settings", column_name: "cycle_start_day" })
      .single()

    if (columnCheckError || !columnExists) {
      console.warn("cycle_start_day column does not exist, creating settings without it")

      const { error } = await supabase.from("user_settings").insert({
        user_id: userId,
        cycle_duration: DEFAULT_SETTINGS.cycleDuration,
        sweet_dessert_limit: DEFAULT_SETTINGS.sweetDessertLimit,
      })

      if (error) {
        console.error("Error creating default user settings:", error)
      }
    } else {
      const { error } = await supabase.from("user_settings").insert({
        user_id: userId,
        cycle_duration: DEFAULT_SETTINGS.cycleDuration,
        cycle_start_day: DEFAULT_SETTINGS.cycleStartDay,
        sweet_dessert_limit: DEFAULT_SETTINGS.sweetDessertLimit,
      })

      if (error) {
        console.error("Error creating default user settings:", error)
      }
    }

    return { ...DEFAULT_SETTINGS }
  } catch (error) {
    console.error("Exception in createDefaultUserSettings:", error)
    return { ...DEFAULT_SETTINGS }
  }
}

// Save user settings to Supabase
export async function saveUserSettings(
  userId: string,
  settings: UserCycleSettings,
): Promise<{ success: boolean; error?: any }> {
  try {
    const supabase = getSupabaseClient()

    // Check if cycle_start_day column exists before updating
    const { data: columnExists, error: columnCheckError } = await supabase
      .rpc("check_column_exists", { table_name: "user_settings", column_name: "cycle_start_day" })
      .single()

    if (columnCheckError) {
      console.error("Error checking if column exists:", columnCheckError)
      return { success: false, error: columnCheckError }
    }

    // Validate settings before saving
    const validatedSettings: Record<string, any> = {
      cycle_duration: Math.max(1, Math.min(30, settings.cycleDuration || DEFAULT_SETTINGS.cycleDuration)),
      sweet_dessert_limit: Math.max(0, Math.min(10, settings.sweetDessertLimit || DEFAULT_SETTINGS.sweetDessertLimit)),
    }

    // Only include cycle_start_day if the column exists
    if (columnExists) {
      validatedSettings.cycle_start_day = Math.max(
        0,
        Math.min(6, settings.cycleStartDay || DEFAULT_SETTINGS.cycleStartDay),
      )
    }

    // Check if user already has settings
    const { data, error: checkError } = await supabase.from("user_settings").select("id").eq("user_id", userId).single()

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Error checking if user has settings:", checkError)
      return { success: false, error: checkError }
    }

    let result
    if (data) {
      // Update existing settings
      result = await supabase.from("user_settings").update(validatedSettings).eq("user_id", userId)
    } else {
      // Insert new settings
      result = await supabase.from("user_settings").insert({
        user_id: userId,
        ...validatedSettings,
      })
    }

    if (result.error) {
      console.error("Error saving user settings:", result.error)
      return { success: false, error: result.error }
    }

    return { success: true }
  } catch (error) {
    console.error("Exception in saveUserSettings:", error)
    return { success: false, error }
  }
}

// Get username by user ID
export async function getUsernameById(userId: string): Promise<string | null> {
  try {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase.from("user_settings").select("username").eq("user_id", userId).single()

    if (error || !data) {
      return null
    }

    return data.username
  } catch (error) {
    console.error("Exception in getUsernameById:", error)
    return null
  }
}

// Get user ID by username
export async function getUserIdByUsername(username: string): Promise<string | null> {
  try {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase.from("user_settings").select("user_id").eq("username", username).single()

    if (error || !data) {
      return null
    }

    return data.user_id
  } catch (error) {
    console.error("Exception in getUserIdByUsername:", error)
    return null
  }
}

// Check if username is available
export async function isUsernameAvailable(
  username: string,
  currentUserId?: string,
): Promise<{ available: boolean; error?: string }> {
  try {
    // Basic validation
    if (!username || username.length < 3) {
      return { available: false, error: "El nombre de usuario debe tener al menos 3 caracteres" }
    }

    if (username.length > 20) {
      return { available: false, error: "El nombre de usuario no puede tener más de 20 caracteres" }
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return { available: false, error: "El nombre de usuario solo puede contener letras, números y guiones bajos" }
    }

    const supabase = getSupabaseClient()

    let query = supabase.from("user_settings").select("user_id").eq("username", username)

    // If we have a current user ID, exclude it from the check
    if (currentUserId) {
      query = query.not("user_id", "eq", currentUserId)
    }

    const { data, error } = await query.single()

    if (error && error.code === "PGRST116") {
      // No rows returned means username is available
      return { available: true }
    } else if (data) {
      // Username exists
      return { available: false, error: "Este nombre de usuario ya está en uso" }
    } else if (error) {
      // Other error
      console.error("Error checking username availability:", error)
      return { available: false, error: "Error al verificar disponibilidad del nombre de usuario" }
    }

    return { available: true }
  } catch (error) {
    console.error("Exception in isUsernameAvailable:", error)
    return { available: false, error: "Error al verificar disponibilidad del nombre de usuario" }
  }
}
