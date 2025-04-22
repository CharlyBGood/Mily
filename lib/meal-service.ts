import { v4 as uuidv4 } from "uuid"
import { getSupabaseClient } from "./supabase-client"
import type { Meal } from "./types"

// Helper function to upload an image to Supabase Storage
export async function uploadImage(file: File): Promise<string> {
  try {
    const supabase = getSupabaseClient()

    // Generate a unique file name
    const fileName = `${uuidv4()}-${file.name.replace(/\s+/g, "_")}`

    // Upload the file to Supabase Storage
    const { data, error } = await supabase.storage.from("meal-images").upload(fileName, file)

    if (error) {
      console.error("Error uploading image:", error)
      throw error
    }

    // Get the public URL for the uploaded file
    const {
      data: { publicUrl },
    } = supabase.storage.from("meal-images").getPublicUrl(data.path)

    return publicUrl
  } catch (error) {
    console.error("Error in uploadImage:", error)
    throw error
  }
}

// Helper function to save a meal to Supabase
export async function saveMeal(meal: Meal): Promise<{ success: boolean; data?: Meal; error?: any }> {
  try {
    const supabase = getSupabaseClient()

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "User not authenticated" }
    }

    // Create new meal with unique ID and timestamp if not provided
    const newMeal: Meal = {
      ...meal,
      id: meal.id || uuidv4(),
      user_id: user.id,
      created_at: meal.created_at || new Date().toISOString(),
    }

    // If updating an existing meal
    if (meal.id) {
      const { data, error } = await supabase
        .from("meals")
        .update({
          description: newMeal.description,
          meal_type: newMeal.meal_type,
          photo_url: newMeal.photo_url,
          notes: newMeal.notes,
        })
        .eq("id", meal.id)
        .eq("user_id", user.id)
        .select()

      if (error) {
        console.error("Error updating meal:", error)
        return { success: false, error }
      }

      return { success: true, data: data[0] as Meal }
    }

    // Add new meal
    const { data, error } = await supabase
      .from("meals")
      .insert([
        {
          id: newMeal.id,
          user_id: newMeal.user_id,
          description: newMeal.description,
          meal_type: newMeal.meal_type,
          photo_url: newMeal.photo_url,
          notes: newMeal.notes,
          created_at: newMeal.created_at,
        },
      ])
      .select()

    if (error) {
      console.error("Error saving meal:", error)
      return { success: false, error }
    }

    return { success: true, data: data[0] as Meal }
  } catch (error) {
    console.error("Error in saveMeal:", error)
    return { success: false, error }
  }
}

// Helper function to get all meals for the current user
export async function getUserMeals(): Promise<{ success: boolean; data?: Meal[]; error?: any }> {
  try {
    const supabase = getSupabaseClient()

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "User not authenticated" }
    }

    // Get all meals for the current user, ordered by creation date (newest first)
    const { data, error } = await supabase
      .from("meals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error getting meals:", error)
      return { success: false, error }
    }

    return { success: true, data: data as Meal[] }
  } catch (error) {
    console.error("Error in getUserMeals:", error)
    return { success: false, error }
  }
}

// Helper function to get a single meal by ID
export async function getMealById(mealId: string): Promise<{ success: boolean; data?: Meal; error?: any }> {
  try {
    const supabase = getSupabaseClient()

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "User not authenticated" }
    }

    // Get the meal by ID
    const { data, error } = await supabase.from("meals").select("*").eq("id", mealId).eq("user_id", user.id).single()

    if (error) {
      console.error("Error getting meal:", error)
      return { success: false, error }
    }

    return { success: true, data: data as Meal }
  } catch (error) {
    console.error("Error in getMealById:", error)
    return { success: false, error }
  }
}

// Helper function to delete a meal
export async function deleteMeal(mealId: string): Promise<{ success: boolean; error?: any }> {
  try {
    const supabase = getSupabaseClient()

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "User not authenticated" }
    }

    // Delete the meal
    const { error } = await supabase.from("meals").delete().eq("id", mealId).eq("user_id", user.id)

    if (error) {
      console.error("Error deleting meal:", error)
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in deleteMeal:", error)
    return { success: false, error }
  }
}
