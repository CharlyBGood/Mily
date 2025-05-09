import { getSupabaseClient } from "./supabase-client"
import type { Meal } from "./types"

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

export interface CycleSettings {
  cycleDuration: number
  cycleStartDay: number
  sweetDessertLimit: number
}

// Cache for cycle settings to avoid repeated database calls
const cycleSettingsCache = new Map<string, { settings: CycleSettings; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes in milliseconds

// Function to get all user cycle settings in one call
export async function getUserCycleSettings(userId?: string): Promise<CycleSettings> {
  if (!userId) {
    return {
      cycleDuration: 7,
      cycleStartDay: 1,
      sweetDessertLimit: 3,
    }
  }

  // Check cache first
  const cachedSettings = cycleSettingsCache.get(userId)
  if (cachedSettings && Date.now() - cachedSettings.timestamp < CACHE_TTL) {
    console.log("Using cached cycle settings for user:", userId)
    return cachedSettings.settings
  }

  try {
    console.log("Fetching cycle settings from database for user:", userId)
    const supabase = getSupabaseClient()

    // First try to use the RPC function if it exists
    try {
      const { data: rpcData, error: rpcError } = await supabase
        .rpc("get_user_cycle_settings", { p_user_id: userId })
        .single()

      if (!rpcError && rpcData) {
        const settings: CycleSettings = {
          cycleDuration: rpcData.cycle_duration || 7,
          cycleStartDay: rpcData.cycle_start_day || 1,
          sweetDessertLimit: rpcData.sweet_dessert_limit || 3,
        }

        // Cache the result
        cycleSettingsCache.set(userId, { settings, timestamp: Date.now() })
        return settings
      }
    } catch (rpcError) {
      console.warn("RPC function not available, falling back to direct query:", rpcError)
    }

    // Fallback to direct query if RPC fails
    const { data, error } = await supabase
      .from("user_settings")
      .select("cycle_duration, cycle_start_day, sweet_dessert_limit")
      .eq("user_id", userId)
      .single()

    if (error) {
      console.error("Error fetching user cycle settings:", error)
      return { cycleDuration: 7, cycleStartDay: 1, sweetDessertLimit: 3 }
    }

    const settings: CycleSettings = {
      cycleDuration: data.cycle_duration || 7,
      cycleStartDay: data.cycle_start_day || 1,
      sweetDessertLimit: data.sweet_dessert_limit || 3,
    }

    // Cache the result
    cycleSettingsCache.set(userId, { settings, timestamp: Date.now() })
    return settings
  } catch (error) {
    console.error("Error in getUserCycleSettings:", error)
    return { cycleDuration: 7, cycleStartDay: 1, sweetDessertLimit: 3 }
  }
}

// Function to count sweet desserts in the current cycle
export function countSweetDessertsInCurrentCycle(meals: Meal[], cycleDuration: number): number {
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

// Function to get user's cycle duration from the database
export async function getUserCycleDuration(userId?: string): Promise<number> {
  if (!userId) return 7 // Default value

  try {
    const settings = await getUserCycleSettings(userId)
    return settings.cycleDuration
  } catch (error) {
    console.error("Error in getUserCycleDuration:", error)
    return 7 // Default value
  }
}

// Function to get user's sweet dessert limit from the database
export async function getUserSweetDessertLimit(userId?: string): Promise<number> {
  if (!userId) return 3 // Default value

  try {
    const settings = await getUserCycleSettings(userId)
    return settings.sweetDessertLimit
  } catch (error) {
    console.error("Error in getUserSweetDessertLimit:", error)
    return 3 // Default value
  }
}

// Function to calculate cycle information
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

// Function to group meals by cycle
export function groupMealsByCycle(meals: Meal[], cycleDuration: number, cycleStartDay: number): CycleGroup[] {
  if (!meals.length) return []

  // Sort meals by date (newest first)
  const sortedMeals = [...meals].sort((a, b) => {
    const dateA = new Date(a.created_at || 0).getTime()
    const dateB = new Date(b.created_at || 0).getTime()
    return dateB - dateA
  })

  // Group meals by date
  const mealsByDate = new Map<string, Meal[]>()
  for (const meal of sortedMeals) {
    if (!meal.created_at) continue

    const date = new Date(meal.created_at)
    const dateStr = date.toISOString().split("T")[0]

    if (!mealsByDate.has(dateStr)) {
      mealsByDate.set(dateStr, [])
    }

    mealsByDate.get(dateStr)!.push(meal)
  }

  // Create array of dates with meals
  const datesWithMeals = Array.from(mealsByDate.entries())
    .map(([dateStr, meals]) => {
      const date = new Date(dateStr)
      const displayDate = formatDate(date)

      return {
        date: dateStr,
        displayDate,
        dateObj: date,
        meals,
      }
    })
    .sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime())

  // Find the earliest and latest dates
  const latestDate = datesWithMeals[0].dateObj
  const earliestDate = datesWithMeals[datesWithMeals.length - 1].dateObj

  // Find the first cycle start date before or on the earliest meal date
  const firstCycleStart = findPreviousCycleStartDate(earliestDate, cycleStartDay)

  // Calculate how many cycles we need
  const totalDays = Math.ceil((latestDate.getTime() - firstCycleStart.getTime()) / (24 * 60 * 60 * 1000)) + 1
  const totalCycles = Math.ceil(totalDays / cycleDuration)

  // Create cycle groups
  const cycleGroups: CycleGroup[] = []

  for (let i = 0; i < totalCycles; i++) {
    const cycleStartDate = new Date(firstCycleStart)
    cycleStartDate.setDate(cycleStartDate.getDate() + i * cycleDuration)

    const cycleEndDate = new Date(cycleStartDate)
    cycleEndDate.setDate(cycleEndDate.getDate() + cycleDuration - 1)

    const daysInCycle = datesWithMeals
      .filter((day) => {
        return day.dateObj >= cycleStartDate && day.dateObj <= cycleEndDate
      })
      .map((day) => ({
        date: day.date,
        displayDate: day.displayDate,
        meals: day.meals,
      }))

    if (daysInCycle.length > 0) {
      cycleGroups.push({
        cycleNumber: i + 1,
        startDate: cycleStartDate.toISOString().split("T")[0],
        endDate: cycleEndDate.toISOString().split("T")[0],
        displayDateRange: `${formatDate(cycleStartDate)} - ${formatDate(cycleEndDate)}`,
        days: daysInCycle,
      })
    }
  }

  return cycleGroups
}

// Helper function to find the previous cycle start date
function findPreviousCycleStartDate(date: Date, cycleStartDay: number): Date {
  const result = new Date(date)

  // Adjust day of week (0 = Sunday, 1 = Monday, etc.)
  const currentDayOfWeek = result.getDay()

  // Calculate days to go back to reach the previous cycle start day
  const daysToSubtract = (currentDayOfWeek - cycleStartDay + 7) % 7

  // If we're already on the cycle start day, don't go back a week
  if (daysToSubtract === 0) {
    return result
  }

  // Go back to the previous cycle start day
  result.setDate(result.getDate() - daysToSubtract)

  return result
}

// Helper function to format date
function formatDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }
  return date.toLocaleDateString("es-ES", options)
}

// Helper function to get day of week name
export function getDayOfWeekName(dayNumber: number): string {
  const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
  return days[dayNumber]
}
