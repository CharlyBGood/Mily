import { format, differenceInDays, addDays, startOfDay, getDay, subDays, nextDay, addWeeks } from "date-fns"
import type { Meal, UserCycleSettings } from "./types"
import * as settingsService from "./settings-service"

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

// Get user's cycle settings from database
export async function getUserCycleSettings(userId: string): Promise<UserCycleSettings> {
  try {
    return await settingsService.getUserSettings(userId)
  } catch (error) {
    console.error("Error in getUserCycleSettings:", error)
    return { ...settingsService.DEFAULT_SETTINGS }
  }
}

// Get user's cycle duration from settings or use default
export async function getUserCycleDuration(userId: string): Promise<number> {
  try {
    const settings = await getUserCycleSettings(userId)
    return settings.cycleDuration
  } catch (error) {
    console.error("Error in getUserCycleDuration:", error)
    return settingsService.DEFAULT_SETTINGS.cycleDuration
  }
}

// Get user's cycle start day from settings or use default
export async function getUserCycleStartDay(userId: string): Promise<number> {
  try {
    const settings = await getUserCycleSettings(userId)
    return settings.cycleStartDay
  } catch (error) {
    console.error("Error in getUserCycleStartDay:", error)
    return settingsService.DEFAULT_SETTINGS.cycleStartDay
  }
}

// Get user's sweet dessert limit from settings or use default
export async function getUserSweetDessertLimit(userId: string): Promise<number> {
  try {
    const settings = await getUserCycleSettings(userId)
    return settings.sweetDessertLimit
  } catch (error) {
    console.error("Error in getUserSweetDessertLimit:", error)
    return settingsService.DEFAULT_SETTINGS.sweetDessertLimit
  }
}

// Find the first day of the cycle that contains the given date
function findCycleStartDate(date: Date, firstMealDate: Date, cycleStartDay: number, cycleDuration: number): Date {
  // Ensure cycleStartDay is valid (0-6)
  cycleStartDay = Math.max(0, Math.min(6, cycleStartDay))

  // Find the first occurrence of the cycle start day on or before the first meal date
  let baseStartDate = startOfDay(firstMealDate)
  const firstMealDayOfWeek = getDay(baseStartDate)

  // Adjust to find the most recent cycle start day on or before the first meal
  if (firstMealDayOfWeek !== cycleStartDay) {
    // Calculate days to go back to reach the previous cycle start day
    const daysToSubtract = (firstMealDayOfWeek - cycleStartDay + 7) % 7
    baseStartDate = subDays(baseStartDate, daysToSubtract)
  }

  // Now calculate how many cycles have passed since the base start date
  const daysSinceBase = differenceInDays(date, baseStartDate)
  const cyclesPassed = Math.floor(daysSinceBase / cycleDuration)

  // Calculate the start date of the current cycle
  return addDays(baseStartDate, cyclesPassed * cycleDuration)
}

// Calculate cycle information for a given date
export function calculateCycleInfo(
  date: Date,
  firstMealDate: Date,
  cycleDuration: number,
  cycleStartDay = 1,
): CycleInfo {
  // Find the start date of the cycle containing this date
  const cycleStartDate = findCycleStartDate(date, firstMealDate, cycleStartDay, cycleDuration)

  // Calculate the end date (start date + duration - 1)
  const cycleEndDate = addDays(cycleStartDate, cycleDuration - 1)

  // Calculate cycle number (1-based)
  const daysSinceFirstCycle = differenceInDays(
    cycleStartDate,
    findCycleStartDate(firstMealDate, firstMealDate, cycleStartDay, cycleDuration),
  )
  const cycleNumber = Math.floor(daysSinceFirstCycle / cycleDuration) + 1

  // Calculate days left in current cycle
  const today = startOfDay(new Date())
  const daysLeft = Math.max(0, differenceInDays(addDays(cycleStartDate, cycleDuration), today))

  return {
    cycleNumber,
    startDate: cycleStartDate,
    endDate: cycleEndDate,
    daysLeft: daysLeft,
  }
}

// Get the next cycle start date
export function getNextCycleStartDate(currentCycleStartDate: Date, cycleDuration: number, cycleStartDay: number): Date {
  // If using weekly cycles aligned to a specific day
  if (cycleDuration % 7 === 0) {
    // For weekly cycles, simply add the number of weeks
    return addWeeks(currentCycleStartDate, cycleDuration / 7)
  } else {
    // For non-weekly cycles, add the duration and find the next occurrence of the start day
    let nextCycleStart = addDays(currentCycleStartDate, cycleDuration)

    // If we need to align to a specific day of week
    if (getDay(nextCycleStart) !== cycleStartDay) {
      // Find the next occurrence of the cycle start day
      nextCycleStart = nextDay(nextCycleStart, cycleStartDay)
    }

    return nextCycleStart
  }
}

// Group meals by cycles
export function groupMealsByCycle(meals: Meal[], cycleDuration: number, cycleStartDay = 1): CycleGroup[] {
  if (!meals.length) return []

  // Sort meals by date (oldest first) to find the first meal date
  const sortedMeals = [...meals].sort((a, b) => {
    return new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime()
  })

  const firstMealDate = startOfDay(new Date(sortedMeals[0].created_at || ""))

  // Add cycle information to each meal
  const mealsWithCycles: MealWithCycle[] = meals.map((meal) => {
    const mealDate = startOfDay(new Date(meal.created_at || ""))
    const cycleInfo = calculateCycleInfo(mealDate, firstMealDate, cycleDuration, cycleStartDay)

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
export function countSweetDessertsInCurrentCycle(meals: Meal[], cycleDuration: number, cycleStartDay = 1): number {
  if (!meals.length) return 0

  // Sort meals by date (oldest first) to find the first meal date
  const sortedMeals = [...meals].sort((a, b) => {
    return new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime()
  })

  const firstMealDate = startOfDay(new Date(sortedMeals[0].created_at || ""))
  const today = startOfDay(new Date())
  const currentCycleInfo = calculateCycleInfo(today, firstMealDate, cycleDuration, cycleStartDay)

  // Filter meals in current cycle that are sweet desserts
  return meals.filter((meal) => {
    if (meal.meal_type !== "postre1" && meal.meal_type !== "postre2") return false

    const mealDate = startOfDay(new Date(meal.created_at || ""))
    const mealCycleInfo = calculateCycleInfo(mealDate, firstMealDate, cycleDuration, cycleStartDay)

    // Check if meal is in current cycle and is a sweet dessert (not a fruit dessert)
    return mealCycleInfo.cycleNumber === currentCycleInfo.cycleNumber && !meal.notes?.toLowerCase().includes("fruta")
  }).length
}

// Check if a meal is a fruit dessert based on notes
export function isFruitDessert(meal: Meal): boolean {
  if (meal.meal_type !== "postre1" && meal.meal_type !== "postre2") return false

  return !!meal.notes?.toLowerCase().includes("fruta")
}

// Get day of week name
export function getDayOfWeekName(dayIndex: number): string {
  const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

  // Ensure index is valid
  const safeIndex = ((dayIndex % 7) + 7) % 7
  return days[safeIndex]
}

// Calculate the next cycle start date based on today
export function calculateNextCycleStartDate(cycleStartDay: number): Date {
  const today = startOfDay(new Date())
  const todayDayOfWeek = getDay(today)

  // Calculate days until next cycle start
  let daysUntilNext = (cycleStartDay - todayDayOfWeek + 7) % 7
  if (daysUntilNext === 0) {
    daysUntilNext = 7 // If today is the start day, next cycle starts in 7 days
  }

  // Calculate next cycle start date
  return addDays(today, daysUntilNext)
}

// Format next cycle start date
export function formatNextCycleStartDate(date: Date, locale = "es-ES"): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric",
    month: "long",
  }
  return date.toLocaleDateString(locale, options)
}
