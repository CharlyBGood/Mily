import { format, differenceInDays, addDays, startOfDay } from "date-fns"
import type { Meal } from "@/lib/types"

export interface CycleInfo {
  cycleNumber: number
  startDate: Date
  endDate: Date
  daysLeft: number
}

export interface MealWithCycle extends Meal {
  cycleInfo?: CycleInfo
}

export interface CycleGroup {
  cycleNumber: number
  startDate: Date
  endDate: Date
  displayDateRange: string
  meals: MealWithCycle[]
}

// Get user's cycle duration from settings or use default
export async function getUserCycleDuration(userId: string): Promise<number> {
  try {
    const { getSupabaseClient } = await import("@/lib/supabase-client")
    const supabase = getSupabaseClient()

    const { data, error } = await supabase.from("user_settings").select("cycle_duration").eq("user_id", userId).single()

    if (error) {
      console.error("Error fetching cycle duration:", error)
      return 7 // Default cycle duration
    }

    return data?.cycle_duration || 7
  } catch (error) {
    console.error("Error in getUserCycleDuration:", error)
    return 7 // Default cycle duration
  }
}

// Get user's sweet dessert limit from settings or use default
export async function getUserSweetDessertLimit(userId: string): Promise<number> {
  try {
    const { getSupabaseClient } = await import("@/lib/supabase-client")
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from("user_settings")
      .select("sweet_dessert_limit")
      .eq("user_id", userId)
      .single()

    if (error) {
      console.error("Error fetching sweet dessert limit:", error)
      return 3 // Default sweet dessert limit
    }

    return data?.sweet_dessert_limit || 3
  } catch (error) {
    console.error("Error in getUserSweetDessertLimit:", error)
    return 3 // Default sweet dessert limit
  }
}

// Calculate cycle information for a given date
export function calculateCycleInfo(date: Date, firstMealDate: Date, cycleDuration: number): CycleInfo {
  // Calculate days since first meal
  const daysSinceStart = differenceInDays(date, firstMealDate)

  // Calculate cycle number (1-based)
  const cycleNumber = Math.floor(daysSinceStart / cycleDuration) + 1

  // Calculate start and end dates of the cycle
  const cycleStartDay = (cycleNumber - 1) * cycleDuration
  const cycleStartDate = addDays(firstMealDate, cycleStartDay)
  const cycleEndDate = addDays(cycleStartDate, cycleDuration - 1)

  // Calculate days left in current cycle
  const today = startOfDay(new Date())
  const daysLeft = differenceInDays(addDays(cycleStartDate, cycleDuration), today)

  return {
    cycleNumber,
    startDate: cycleStartDate,
    endDate: cycleEndDate,
    daysLeft: daysLeft,
  }
}

// Group meals by cycles
export function groupMealsByCycle(meals: Meal[], cycleDuration: number): CycleGroup[] {
  if (!meals.length) return []

  // Sort meals by date (oldest first) to find the first meal date
  const sortedMeals = [...meals].sort((a, b) => {
    return new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime()
  })

  const firstMealDate = startOfDay(new Date(sortedMeals[0].created_at || ""))

  // Add cycle information to each meal
  const mealsWithCycles: MealWithCycle[] = meals.map((meal) => {
    const mealDate = startOfDay(new Date(meal.created_at || ""))
    const cycleInfo = calculateCycleInfo(mealDate, firstMealDate, cycleDuration)

    return {
      ...meal,
      cycleInfo,
    }
  })

  // Group meals by cycle
  const cycleGroups: Record<number, MealWithCycle[]> = {}

  mealsWithCycles.forEach((meal) => {
    if (!meal.cycleInfo) return

    const cycleNumber = meal.cycleInfo.cycleNumber

    if (!cycleGroups[cycleNumber]) {
      cycleGroups[cycleNumber] = []
    }

    cycleGroups[cycleNumber].push(meal)
  })

  // Convert to array and sort by cycle number (newest first)
  return Object.entries(cycleGroups)
    .map(([cycleNumber, meals]) => {
      const cycleInfo = meals[0].cycleInfo!

      return {
        cycleNumber: Number.parseInt(cycleNumber),
        startDate: cycleInfo.startDate,
        endDate: cycleInfo.endDate,
        displayDateRange: `Ciclo ${cycleNumber}: ${format(cycleInfo.startDate, "dd/MM/yyyy")} - ${format(cycleInfo.endDate, "dd/MM/yyyy")}`,
        meals: meals.sort((a, b) => {
          // Sort meals within cycle by date (newest first)
          return new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime()
        }),
      }
    })
    .sort((a, b) => b.cycleNumber - a.cycleNumber) // Sort cycles by number (newest first)
}

// Count sweet desserts in the current cycle
export function countSweetDessertsInCurrentCycle(meals: Meal[], cycleDuration: number): number {
  if (!meals.length) return 0

  // Sort meals by date (oldest first) to find the first meal date
  const sortedMeals = [...meals].sort((a, b) => {
    return new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime()
  })

  const firstMealDate = startOfDay(new Date(sortedMeals[0].created_at || ""))
  const today = startOfDay(new Date())
  const currentCycleInfo = calculateCycleInfo(today, firstMealDate, cycleDuration)

  // Filter meals in current cycle that are sweet desserts
  return meals.filter((meal) => {
    if (meal.meal_type !== "postre1" && meal.meal_type !== "postre2") return false

    const mealDate = startOfDay(new Date(meal.created_at || ""))
    const mealCycleInfo = calculateCycleInfo(mealDate, firstMealDate, cycleDuration)

    // Check if meal is in current cycle and is a sweet dessert (not a fruit dessert)
    return mealCycleInfo.cycleNumber === currentCycleInfo.cycleNumber && !meal.notes?.toLowerCase().includes("fruta")
  }).length
}

// Check if a meal is a fruit dessert based on notes
export function isFruitDessert(meal: Meal): boolean {
  if (meal.meal_type !== "postre1" && meal.meal_type !== "postre2") return false

  return !!meal.notes?.toLowerCase().includes("fruta")
}
