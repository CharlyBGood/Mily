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

const MEALS_STORAGE_KEY = "nutriapp_meals"

// Helper function to save a meal photo (converts to base64)
export async function savePhotoToLocalStorage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      const result = reader.result as string

      // For Safari compatibility, we'll check if we need to resize the image
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

      if (isSafari) {
        // Resize the image for Safari to avoid memory issues
        resizeImage(result, 1200, 1200)
          .then((resizedImage) => {
            resolve(resizedImage)
          })
          .catch((err) => {
            console.error("Error resizing image:", err)
            // Fall back to original image
            resolve(result)
          })
      } else {
        resolve(result)
      }
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

      // Get data URL
      const resizedDataUrl = canvas.toDataURL("image/jpeg", 0.85)
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
      id: uuidv4(),
      created_at: new Date().toISOString(),
    }

    // Add new meal to the array
    const updatedMeals = [...existingMeals, newMeal]
    console.log("Updated meals after save:", updatedMeals.length)

    // Save the updated array back to localStorage
    const saveResult = saveMealsToStorage(updatedMeals)
    if (!saveResult.success) {
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
    // localStorage typically has a 5MB limit
    if (mealsJson.length > 4 * 1024 * 1024) {
      // 4MB safety limit
      console.warn("Meals data is approaching localStorage size limit")

      // If too large, we could implement a strategy like:
      // 1. Remove oldest meals
      // 2. Compress images further
      // 3. Split into multiple localStorage keys

      // For now, just warn and continue
    }

    // Save to localStorage
    localStorage.setItem(MEALS_STORAGE_KEY, mealsJson)
    return { success: true }
  } catch (error) {
    console.error("Error writing to localStorage:", error)
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

