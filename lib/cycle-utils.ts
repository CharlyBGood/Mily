import { getSupabaseClient } from "@/lib/supabase-client"
import type { Meal } from "@/lib/types"

// Type for cycle settings
export interface CycleSettings {
  cycleDuration: number
  cycleStartDay: number
  sweetDessertLimit: number
}

// Type for cycle group
export interface CycleGroup {
  cycleNumber: number
  startDate: string
  endDate: string
  displayDateRange: string
  days: {
    date: string
    displayDate: string
    meals: Meal[]
  }[]
}

// Cache for cycle settings to avoid repeated database calls
const cycleSettingsCache: Record<string, { timestamp: number; settings: CycleSettings }> = {}

// Cache expiration time in milliseconds (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000

export function clearCycleSettingsCache(userId: string): void {
  if (cycleSettingsCache[userId]) {
    delete cycleSettingsCache[userId]
  }
}

export async function getUserCycleSettings(userId: string): Promise<CycleSettings> {
  // Check if we have cached settings that aren't expired
  if (cycleSettingsCache[userId] && Date.now() - cycleSettingsCache[userId].timestamp < CACHE_EXPIRATION) {
    return cycleSettingsCache[userId].settings
  }

  try {
    const supabase = getSupabaseClient()

    try {
      const { data, error } = await supabase
        .from("user_settings")
        .select("cycle_duration, cycle_start_day, sweet_dessert_limit")
        .eq("user_id", userId)
        .single()

      if (!error && data) {
        const settings: CycleSettings = {
          cycleDuration: data.cycle_duration || 7,
          cycleStartDay: data.cycle_start_day !== undefined ? data.cycle_start_day : 1,
          sweetDessertLimit: data.sweet_dessert_limit || 3,
        }

        // Cache the settings
        cycleSettingsCache[userId] = {
          timestamp: Date.now(),
          settings,
        }

        return settings
      }
    } catch (error) {
      console.error("Error fetching cycle settings:", error)
    }

    // Return default settings if there was an error or no data
    const defaultSettings: CycleSettings = {
      cycleDuration: 7,
      cycleStartDay: 1, // Monday
      sweetDessertLimit: 3,
    }

    // Cache the default settings
    cycleSettingsCache[userId] = {
      timestamp: Date.now(),
      settings: defaultSettings,
    }

    return defaultSettings
  } catch (error) {
    console.error("Error in getUserCycleSettings:", error)
    // Return default settings
    return {
      cycleDuration: 7,
      cycleStartDay: 1, // Monday
      sweetDessertLimit: 3,
    }
  }
}

/**
 * Get cycle duration for a user
 */
export async function getUserCycleDuration(userId?: string): Promise<number> {
  if (!userId) return 7 // Default for local storage users

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
export async function getUserSweetDessertLimit(userId?: string): Promise<number> {
  if (!userId) return 3 // Default for local storage users

  try {
    const settings = await getUserCycleSettings(userId)
    return settings.sweetDessertLimit
  } catch (error) {
    console.error("Error in getUserSweetDessertLimit:", error)
    return 3 // Default to 3
  }
}

/**
 * Count sweet desserts in the current cycle
 */
export function countSweetDessertsInCurrentCycle(meals: Meal[], cycleDuration: number): number {
  if (!meals || meals.length === 0) return 0

  const now = new Date()
  const cycleStartDate = new Date(now.getTime() - cycleDuration * 24 * 60 * 60 * 1000)
  let count = 0

  for (const meal of meals) {
    if (meal.meal_type === "postre1" && meal.created_at) {
      const mealDate = new Date(meal.created_at)
      if (mealDate >= cycleStartDate && mealDate <= now) {
        count++
      }
    }
  }

  return count
}

/**
 * Calculate cycle information based on dates and cycle duration
 */
export function calculateCycleInfo(
  today: Date,
  firstMealDate: Date,
  cycleDuration: number,
): {
  cycleNumber: number
  daysLeft: number
} {
  const timeDiff = today.getTime() - firstMealDate.getTime()
  const dayDiff = Math.floor(timeDiff / (1000 * 3600 * 24))
  const cycleNumber = Math.floor(dayDiff / cycleDuration) + 1
  const daysLeft = cycleDuration - (dayDiff % cycleDuration)

  return {
    cycleNumber,
    daysLeft,
  }
}

export interface CycleDay {
  date: string
  displayDate: string
  meals: any[]
}

/**
 * Format a date as YYYY-MM-DD
 */
function formatDateYYYYMMDD(date: Date): string {
  return date.toISOString().split("T")[0]
}

/**
 * Get the day of the week (0-6, where 0 is Sunday)
 */
function getDayOfWeek(date: Date): number {
  return date.getDay()
}

/**
 * Find the start date of a cycle based on a reference date and cycle start day
 */
function findCycleStartDate(referenceDate: Date, cycleStartDay: number): Date {
  const refDayOfWeek = getDayOfWeek(referenceDate)
  const daysToSubtract = (refDayOfWeek - cycleStartDay + 7) % 7

  const startDate = new Date(referenceDate)
  startDate.setDate(referenceDate.getDate() - daysToSubtract)
  return startDate
}

/**
 * Format a date range for display
 */
function formatDateRange(startDate: Date, endDate: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
  }

  const start = startDate.toLocaleDateString("es-ES", options)
  const end = endDate.toLocaleDateString("es-ES", options)

  return `${start} - ${end}`
}

/**
 * Group meals by cycle
 */
export function groupMealsByCycle(meals: Meal[], cycleDuration = 7, cycleStartDay = 1): CycleGroup[] {
  // Handle empty meals array
  if (!meals || meals.length === 0) {
    return []
  }

  try {
    // Sort meals by date (newest first)
    const sortedMeals = [...meals].sort((a, b) => {
      const dateA = new Date(a.date || a.created_at || 0).getTime()
      const dateB = new Date(b.date || b.created_at || 0).getTime()
      return dateB - dateA
    })

    // Find the date range
    const newestDate = new Date(sortedMeals[0].date || sortedMeals[0].created_at || Date.now())
    const oldestDate = new Date(
      sortedMeals[sortedMeals.length - 1].date || sortedMeals[sortedMeals.length - 1].created_at || Date.now(),
    )

    // Find the most recent cycle start date
    const mostRecentCycleStart = findCycleStartDate(newestDate, cycleStartDay)

    // Calculate how many cycles we need to cover all meals
    const daysBetween = Math.ceil((mostRecentCycleStart.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24))
    const numCycles = Math.ceil(daysBetween / cycleDuration) + 1

    // Create cycle groups
    const cycleGroups: CycleGroup[] = []

    for (let i = 0; i < numCycles; i++) {
      // Calculate cycle start and end dates
      const cycleStartDate = new Date(mostRecentCycleStart)
      cycleStartDate.setDate(mostRecentCycleStart.getDate() - i * cycleDuration)

      const cycleEndDate = new Date(cycleStartDate)
      cycleEndDate.setDate(cycleStartDate.getDate() + cycleDuration - 1)

      // Format dates for display
      const startDateStr = formatDateYYYYMMDD(cycleStartDate)
      const endDateStr = formatDateYYYYMMDD(cycleEndDate)
      const displayDateRange = `Ciclo ${i + 1}: ${formatDateRange(cycleStartDate, cycleEndDate)}`

      // Create day buckets for this cycle
      const dayBuckets: Record<string, Meal[]> = {}

      // Initialize all days in the cycle
      for (let j = 0; j < cycleDuration; j++) {
        const dayDate = new Date(cycleStartDate)
        dayDate.setDate(cycleStartDate.getDate() + j)
        const dayDateStr = formatDateYYYYMMDD(dayDate)
        dayBuckets[dayDateStr] = []
      }

      // Add meals to the appropriate day bucket
      for (const meal of sortedMeals) {
        const mealDate = formatDateYYYYMMDD(new Date(meal.date || meal.created_at || Date.now()))
        if (mealDate >= startDateStr && mealDate <= endDateStr) {
          if (!dayBuckets[mealDate]) {
            dayBuckets[mealDate] = []
          }
          dayBuckets[mealDate].push(meal)
        }
      }

      // Convert day buckets to array format
      const days = Object.entries(dayBuckets)
        .map(([date, dayMeals]) => {
          const displayDate = new Date(date).toLocaleDateString("es-ES", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })

          return {
            date,
            displayDate: displayDate.charAt(0).toUpperCase() + displayDate.slice(1),
            meals: dayMeals,
          }
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      // Only add cycles that have meals
      const hasMeals = days.some((day) => day.meals.length > 0)

      if (hasMeals) {
        cycleGroups.push({
          cycleNumber: i + 1,
          startDate: startDateStr,
          endDate: endDateStr,
          displayDateRange,
          days,
        })
      }
    }

    return cycleGroups
  } catch (error) {
    console.error("Error in groupMealsByCycle:", error)
    return []
  }
}

/**
 * Helper function to get day of week name
 */
export function getDayOfWeekName(dayNumber: number): string {
  const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
  return days[dayNumber] || "Lunes"
}

// Improve getCurrentCycleInfo to handle real-time updates
export function getCurrentCycleInfo(cycleDuration = 7, cycleStartDay = 1) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // Calculate cycle start date more accurately
  const dayOfWeek = today.getDay()
  const daysFromCycleStart = (dayOfWeek - cycleStartDay + 7) % 7
  const currentCycleStart = new Date(today)
  currentCycleStart.setDate(today.getDate() - daysFromCycleStart)

  // Calculate current day in cycle (1-based)
  const dayInCycle = Math.floor((today.getTime() - currentCycleStart.getTime()) / (1000 * 60 * 60 * 24)) + 1

  // Calculate cycle end date
  const currentCycleEnd = new Date(currentCycleStart)
  currentCycleEnd.setDate(currentCycleStart.getDate() + cycleDuration - 1)

  return {
    cycleStart: currentCycleStart,
    cycleEnd: currentCycleEnd,
    dayInCycle: Math.min(dayInCycle, cycleDuration),
    isComplete: dayInCycle > cycleDuration,
  }
}
