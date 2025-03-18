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
      resolve(reader.result as string)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Helper function to save a meal to localStorage
export async function saveMeal(meal: Meal): Promise<{ success: boolean; data?: Meal; error?: any }> {
  try {
    const meals = getMealsFromStorage()

    const newMeal: Meal = {
      ...meal,
      id: uuidv4(),
      created_at: new Date().toISOString(),
    }

    meals.push(newMeal)
    saveMealsToStorage(meals)

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
    return { success: true, data: meals }
  } catch (error) {
    console.error("Error getting meals from localStorage:", error)
    return { success: false, error }
  }
}

// Helper function to delete a meal
export async function deleteMeal(mealId: string): Promise<{ success: boolean; error?: any }> {
  try {
    let meals = getMealsFromStorage()
    meals = meals.filter((meal) => meal.id !== mealId)
    saveMealsToStorage(meals)

    return { success: true }
  } catch (error) {
    console.error("Error deleting meal from localStorage:", error)
    return { success: false, error }
  }
}

// Helper functions to interact with localStorage
function getMealsFromStorage(): Meal[] {
  if (typeof window === "undefined") return []

  try {
    const mealsJson = localStorage.getItem(MEALS_STORAGE_KEY)
    return mealsJson ? JSON.parse(mealsJson) : []
  } catch (error) {
    console.error("Error reading from localStorage:", error)
    return []
  }
}

function saveMealsToStorage(meals: Meal[]): void {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(MEALS_STORAGE_KEY, JSON.stringify(meals))
  } catch (error) {
    console.error("Error writing to localStorage:", error)
  }
}

