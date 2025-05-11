import { getSupabaseClient } from "@/lib/supabase-client"
import type { Meal } from "@/lib/types"

// Cache for user cycle settings
const cycleSettingsCache: Record<string, { cycleDuration: number; cycleStartDay: number; sweetDessertLimit: number }> =
  {}

// Clear the cache for a specific user
export function clearCycleSettingsCache(userId: string): void {
  delete cycleSettingsCache[userId]
}

// Get the name of a day of the week
export function getDayOfWeekName(dayNumber: number): string {
  const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
  return days[dayNumber]
}

// Get user cycle settings from the database or cache
export async function getUserCycleSettings(userId: string) {
  // Check if we have cached settings
  if (cycleSettingsCache[userId]) {
    return cycleSettingsCache[userId]
  }

  try {
    const supabase = getSupabaseClient()

    // Try to get user settings
    try {
      const { data, error } = await supabase
        .from("user_settings")
        .select("cycle_duration, cycle_start_day, sweet_dessert_limit")
        .eq("user_id", userId)
        .single()

      if (!error && data) {
        // Cache the settings
        cycleSettingsCache[userId] = {
          cycleDuration: data.cycle_duration || 7,
          cycleStartDay: data.cycle_start_day !== undefined ? data.cycle_start_day : 1,
          sweetDessertLimit: data.sweet_dessert_limit || 3,
        }
        return cycleSettingsCache[userId]
      } else if (error && error.message.includes("does not exist")) {
        console.log("User settings table doesn't exist, using defaults")
        // Use defaults
        cycleSettingsCache[userId] = {
          cycleDuration: 7,
          cycleStartDay: 1,
          sweetDessertLimit: 3,
        }
        return cycleSettingsCache[userId]
      }
    } catch (error) {
      console.error("Error getting user cycle settings:", error)
    }

    // If we get here, use defaults
    cycleSettingsCache[userId] = {
      cycleDuration: 7,
      cycleStartDay: 1,
      sweetDessertLimit: 3,
    }
    return cycleSettingsCache[userId]
  } catch (error) {
    console.error("Error in getUserCycleSettings:", error)
    // Return defaults if there's an error
    return {
      cycleDuration: 7,
      cycleStartDay: 1,
      sweetDessertLimit: 3,
    }
  }
}

/**
 * Get cycle duration for a user
 */
export async function getUserCycleDuration(userId: string): Promise<number> {
  try {
    const settings = await getUserCycleSettings(userId)
    return settings.cycleDuration
  } catch (error) {
    console.error("Error in getUserCycleDuration:", error)
    return 7 // Default to 7 days
  }
}

/**
 * Get sweet dessert limit for a user
 */
export async function getUserSweetDessertLimit(userId: string): Promise<number> {
  try {
    const settings = await getUserCycleSettings(userId)
    return settings.sweetDessertLimit
  } catch (error) {
    console.error("Error in getUserSweetDessertLimit:", error)
    return 3 // Default to 3
  }
}

// Calculate cycle information for a given date
export function calculateCycleInfo(date: Date, cycleDuration: number, cycleStartDay: number) {
  // Get the day of the week (0 = Sunday, 1 = Monday, etc.)
  const dayOfWeek = date.getDay()

  // Calculate days since the most recent cycle start day
  let daysSinceCycleStart = (dayOfWeek - cycleStartDay + 7) % 7

  // If today is the cycle start day, it's day 0 of the current cycle
  if (daysSinceCycleStart === 0) {
    daysSinceCycleStart = 0
  }

  // Calculate the date of the current cycle start
  const cycleStartDate = new Date(date)
  cycleStartDate.setDate(date.getDate() - daysSinceCycleStart)

  // Calculate the cycle number (days since epoch / cycle duration)
  const epochStart = new Date(2020, 0, 1) // Use a fixed epoch start
  const daysSinceEpoch = Math.floor((cycleStartDate.getTime() - epochStart.getTime()) / (1000 * 60 * 60 * 24))
  const cycleNumber = Math.floor(daysSinceEpoch / cycleDuration)

  // Calculate the day within the cycle (0-based)
  const dayInCycle = daysSinceCycleStart

  return {
    cycleNumber,
    dayInCycle,
    cycleStartDate,
  }
}

// Group meals by cycle
export function groupMealsByCycle(meals: Meal[], cycleDuration: number, cycleStartDay: number) {
  if (!meals || meals.length === 0) {
    return []
  }

  // Sort meals by date (newest first)
  const sortedMeals = [...meals].sort((a, b) => {
    const dateA = new Date(a.created_at || "")
    const dateB = new Date(b.created_at || "")
    return dateB.getTime() - dateA.getTime()
  })

  // Group meals by cycle
  const cycleGroups: Record<
    number,
    {
      cycleNumber: number
      startDate: Date
      endDate: Date
      days: Record<string, Meal[]>
    }
  > = {}

  // Process each meal
  sortedMeals.forEach((meal) => {
    if (!meal.created_at) return

    const mealDate = new Date(meal.created_at)
    const { cycleNumber, cycleStartDate } = calculateCycleInfo(mealDate, cycleDuration, cycleStartDay)

    // Calculate cycle end date
    const cycleEndDate = new Date(cycleStartDate)
    cycleEndDate.setDate(cycleStartDate.getDate() + cycleDuration - 1)

    // Format date as YYYY-MM-DD for grouping
    const dateKey = mealDate.toISOString().split("T")[0]

    // Create cycle group if it doesn't exist
    if (!cycleGroups[cycleNumber]) {
      cycleGroups[cycleNumber] = {
        cycleNumber,
        startDate: cycleStartDate,
        endDate: cycleEndDate,
        days: {},
      }
    }

    // Create day group if it doesn't exist
    if (!cycleGroups[cycleNumber].days[dateKey]) {
      cycleGroups[cycleNumber].days[dateKey] = []
    }

    // Add meal to the day group
    cycleGroups[cycleNumber].days[dateKey].push(meal)
  })

  // Convert to array and sort by cycle number (newest first)
  return Object.values(cycleGroups)
    .sort((a, b) => b.cycleNumber - a.cycleNumber)
    .map((cycle) => {
      // Convert days object to array of { date, meals } objects
      const daysArray = Object.entries(cycle.days).map(([date, meals]) => ({
        date,
        meals,
      }))

      // Sort days by date (newest first)
      const sortedDays = daysArray.sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      })

      return {
        ...cycle,
        days: sortedDays,
      }
    })
}

// Count sweet desserts in the current cycle
export function countSweetDessertsInCurrentCycle(meals: Meal[], cycleDuration: number, cycleStartDay: number) {
  if (!meals || meals.length === 0) {
    return 0
  }

  // Get current date
  const today = new Date()

  // Calculate current cycle info
  const { cycleNumber } = calculateCycleInfo(today, cycleDuration, cycleStartDay)

  // Filter meals in the current cycle that are sweet desserts
  const sweetDesserts = meals.filter((meal) => {
    if (!meal.created_at) return false

    const mealDate = new Date(meal.created_at)
    const mealCycleInfo = calculateCycleInfo(mealDate, cycleDuration, cycleStartDay)

    return (
      mealCycleInfo.cycleNumber === cycleNumber &&
      meal.meal_type === "postre" &&
      (meal.description?.toLowerCase().includes("dulce") || false)
    )
  })

  return sweetDesserts.length
}

// Export types
export interface CycleGroup {
  cycleNumber: number
  startDate: Date
  endDate: Date
  days: Array<{
    date: string
    meals: Meal[]
  }>
}
