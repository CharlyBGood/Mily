import { v4 as uuidv4 } from "uuid"

export type MealType = "desayuno" | "colacion1" | "almuerzo" | "postre1" | "merienda" | "colacion2" | "cena" | "postre2"

export interface Meal {
  id?: string
  user_id?: string
  description: string
  meal_type: MealType
  photo_url?: string
  notes?: string
  created_at?: string
}

// Update the storage key from nutriapp_meals to mily_meals
const MEALS_STORAGE_KEY = "mily_meals"

// Helper function to save a meal photo (converts to base64)
export async function savePhotoToLocalStorage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      const result = reader.result as string

      // For mobile compatibility, we'll resize the image to reduce storage size
      resizeImage(result, 800, 800)
        .then((resizedImage) => {
          resolve(resizedImage)
        })
        .catch((err) => {
          console.error("Error resizing image:", err)
          // Fall back to original image
          resolve(result)
        })
    }

    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Helper function to resize an image
function resizeImage(dataUrl: string, maxWidth: number, maxHeight: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let width = img.width
      let height = img.height

      // Calculate new dimensions
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height)
          height = maxHeight
        }
      }

      // Create canvas and resize
      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("Could not get canvas context"))
        return
      }

      // Draw image with smoothing
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = "high"
      ctx.drawImage(img, 0, 0, width, height)

      // Get data URL with reduced quality for Android compatibility
      const resizedDataUrl = canvas.toDataURL("image/jpeg", 0.7) // Lower quality for better storage
      resolve(resizedDataUrl)
    }

    img.onerror = () => {
      reject(new Error("Error loading image for resizing"))
    }

    img.src = dataUrl
  })
}

// Helper function to save a meal to localStorage
export async function saveMeal(meal: Meal): Promise<{ success: boolean; data?: Meal; error?: any }> {
  try {
    // Get existing meals from localStorage
    const existingMeals = getMealsFromStorage()
    console.log("Existing meals before save:", existingMeals.length)

    // Create new meal with unique ID and timestamp
    const newMeal: Meal = {
      ...meal,
      id: meal.id || uuidv4(),
      created_at: meal.created_at || new Date().toISOString(),
    }

    // If updating an existing meal
    if (meal.id) {
      // Find and replace the existing meal
      const updatedMeals = existingMeals.map((m) => (m.id === meal.id ? newMeal : m))
      console.log("Updated meals after update:", updatedMeals.length)

      // Save the updated array back to localStorage
      const saveResult = saveMealsToStorage(updatedMeals)
      if (!saveResult.success) {
        return { success: false, error: saveResult.error }
      }

      return { success: true, data: newMeal }
    }

    // Add new meal to the array
    const updatedMeals = [...existingMeals, newMeal]
    console.log("Updated meals after save:", updatedMeals.length)

    // Save the updated array back to localStorage
    const saveResult = saveMealsToStorage(updatedMeals)
    if (!saveResult.success) {
      // If we hit storage limits, try to reduce the size by compressing images further
      if (
        saveResult.error &&
        typeof saveResult.error === "string" &&
        (saveResult.error.includes("quota") || saveResult.error.includes("storage"))
      ) {
        console.warn("Storage limit reached, attempting to optimize storage...")

        // Try to optimize by reducing image quality of the new meal
        if (newMeal.photo_url && newMeal.photo_url.startsWith("data:image")) {
          try {
            const optimizedImage = await resizeImage(newMeal.photo_url, 600, 600) // Smaller size
            newMeal.photo_url = optimizedImage

            // Try saving again with the optimized image
            const updatedMealsOptimized = [...existingMeals, newMeal]
            const retryResult = saveMealsToStorage(updatedMealsOptimized)

            if (retryResult.success) {
              return { success: true, data: newMeal }
            }
          } catch (e) {
            console.error("Error optimizing image:", e)
          }
        }

        // If still failing, try removing the oldest meal to make space
        if (existingMeals.length > 0) {
          console.warn("Still hitting storage limits, removing oldest meal to make space")
          const sortedMeals = [...existingMeals].sort((a, b) => {
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
            return dateA - dateB // Oldest first
          })

          // Remove the oldest meal
          const reducedMeals = sortedMeals.slice(1)

          // Add the new meal
          const updatedReducedMeals = [...reducedMeals, newMeal]
          const lastChanceResult = saveMealsToStorage(updatedReducedMeals)

          if (lastChanceResult.success) {
            return {
              success: true,
              data: newMeal,
              error: "Storage limit reached. The oldest meal was automatically removed to make space.",
            }
          }
        }
      }

      return { success: false, error: saveResult.error }
    }

    return { success: true, data: newMeal }
  } catch (error) {
    console.error("Error saving meal to localStorage:", error)
    return { success: false, error }
  }
}

// Helper function to get all meals
export async function getUserMeals(): Promise<{ success: boolean; data?: Meal[]; error?: any }> {
  try {
    const meals = getMealsFromStorage()
    console.log("Retrieved meals:", meals.length)
    return { success: true, data: meals }
  } catch (error) {
    console.error("Error getting meals from localStorage:", error)
    return { success: false, error }
  }
}

// Helper function to get a single meal by ID
export async function getMealById(mealId: string): Promise<{ success: boolean; data?: Meal; error?: any }> {
  try {
    const meals = getMealsFromStorage()
    const meal = meals.find((m) => m.id === mealId)

    if (!meal) {
      return { success: false, error: "Meal not found" }
    }

    return { success: true, data: meal }
  } catch (error) {
    console.error("Error getting meal from localStorage:", error)
    return { success: false, error }
  }
}

// Helper function to delete a meal
export async function deleteMeal(mealId: string): Promise<{ success: boolean; error?: any }> {
  try {
    // Get existing meals
    const meals = getMealsFromStorage()
    console.log("Meals before delete:", meals.length)

    // Filter out the meal to delete
    const updatedMeals = meals.filter((meal) => meal.id !== mealId)
    console.log("Meals after delete:", updatedMeals.length)

    // Save the updated array
    const saveResult = saveMealsToStorage(updatedMeals)
    if (!saveResult.success) {
      return { success: false, error: saveResult.error }
    }

    return { success: true }
  } catch (error) {
    console.error("Error deleting meal from localStorage:", error)
    return { success: false, error }
  }
}

// Helper function to get meals from localStorage
function getMealsFromStorage(): Meal[] {
  if (typeof window === "undefined") return []

  try {
    const mealsJson = localStorage.getItem(MEALS_STORAGE_KEY)

    // If no meals exist yet, return empty array
    if (!mealsJson) return []

    // Parse the JSON string to get the meals array
    const meals = JSON.parse(mealsJson)

    // Ensure it's an array
    if (!Array.isArray(meals)) {
      console.error("Meals in localStorage is not an array, resetting")
      return []
    }

    return meals
  } catch (error) {
    console.error("Error reading from localStorage:", error)
    // If there's an error, return empty array
    return []
  }
}

// Helper function to save meals to localStorage
function saveMealsToStorage(meals: Meal[]): { success: boolean; error?: any } {
  if (typeof window === "undefined") return { success: false, error: "Window is undefined" }

  try {
    // Ensure meals is an array
    if (!Array.isArray(meals)) {
      throw new Error("Meals must be an array")
    }

    // Convert to JSON string
    const mealsJson = JSON.stringify(meals)

    // Check if the data is too large for localStorage
    // localStorage typically has a 5MB limit, but mobile browsers might have less
    const estimatedSize = mealsJson.length * 2 // Rough estimate in bytes
    console.log(`Estimated storage size: ${(estimatedSize / 1024 / 1024).toFixed(2)}MB`)

    if (estimatedSize > 4 * 1024 * 1024) {
      // 4MB safety limit
      console.warn("Meals data is approaching localStorage size limit")
    }

    // Try to save to localStorage
    try {
      localStorage.setItem(MEALS_STORAGE_KEY, mealsJson)
      return { success: true }
    } catch (e) {
      // Handle quota exceeded error specifically
      if (e instanceof Error) {
        console.error("Error writing to localStorage:", e.message)
        return { success: false, error: e.message }
      }
      return { success: false, error: "Unknown storage error" }
    }
  } catch (error) {
    console.error("Error preparing data for localStorage:", error)
    return { success: false, error }
  }
}

// Helper function to clear all meals (for testing/debugging)
export function clearAllMeals(): { success: boolean; error?: any } {
  if (typeof window === "undefined") return { success: false, error: "Window is undefined" }

  try {
    localStorage.removeItem(MEALS_STORAGE_KEY)
    return { success: true }
  } catch (error) {
    console.error("Error clearing meals from localStorage:", error)
    return { success: false, error }
  }
}
