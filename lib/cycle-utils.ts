// -------------------------------------------------------------------------------------------------
// Cycle-related utilities  (mobile-first refactor - production build)
// -------------------------------------------------------------------------------------------------

import type { Meal } from "@/lib/types"
// import { getSupabaseClient } from "@/lib/supabase-client"  // ← Uncomment when real settings fetch

// ---------- Types --------------------------------------------------------------------------------

export interface CycleSettings {
  cycleDuration: number // days in a cycle
  cycleStartDay: number // 0-6  (0 = Sunday)
  sweetDessertLimit: number // allowed “postre1” per cycle
}

export interface CycleInfo {
  cycleNumber: number
  startDate: Date
  endDate: Date
  progress: number // 0-1 (percentage of cycle completed)
}

export interface CycleGroupDay {
  date: string // YYYY-MM-DD
  displayDate: string // Lunes 1 Ene, …
  meals: Meal[]
}

export interface CycleGroup {
  cycleNumber: number
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  displayDateRange: string // Ciclo 1: 01 Ene – 07 Ene
  days: CycleGroupDay[]
}

// ---------- Internal helpers ---------------------------------------------------------------------

const DAYS_ES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

function formatISO(date: Date) {
  return date.toISOString().split("T")[0]
}

function toDisplayDate(date: Date) {
  return date.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}

// Helper: get the last cycle start date before or equal to a given date, based on cycleStartDay
function getLastCycleStart(date: Date, cycleStartDay: number) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = (day - cycleStartDay + 7) % 7
  d.setDate(d.getDate() - diff)
  return d
}

// ---------- Exported helpers ---------------------------------------------------------------------

export function getDayOfWeekName(day: number) {
  // Normaliza a 0-6 para evitar valores fuera de rango
  const normalized = ((Math.round(day) % 7) + 7) % 7
  return DAYS_ES[normalized]
}

// Cached settings (5 min TTL) — keeps client fast without extra network
const settingsCache: Record<string, { ts: number; data: CycleSettings }> = {}
const TTL = 5 * 60 * 1000

export async function getUserCycleSettings(userId: string): Promise<CycleSettings> {
  // 1. return cached
  const cache = settingsCache[userId]
  if (cache && Date.now() - cache.ts < TTL) return cache.data

  // 2. Fetch from Supabase
  try {
    const supabase = (await import("@/lib/supabase-client")).getSupabaseClient()
    const { data, error } = await supabase
      .from("user_settings")
      .select("cycle_duration, cycle_start_day, sweet_dessert_limit")
      .eq("user_id", userId)
      .single()
    if (!error && data) {
      const settings: CycleSettings = {
        cycleDuration: Number(data.cycle_duration) || 7,
        cycleStartDay: Number(data.cycle_start_day) || 1,
        sweetDessertLimit: Number(data.sweet_dessert_limit) || 3,
      }
      settingsCache[userId] = { ts: Date.now(), data: settings }
      return settings
    }
  } catch (err) {
    console.error("Error fetching user cycle settings from Supabase:", err)
  }

  // 3. Fallback defaults
  const defaults: CycleSettings = { cycleDuration: 7, cycleStartDay: 1, sweetDessertLimit: 3 }
  settingsCache[userId] = { ts: Date.now(), data: defaults }
  return defaults
}

// ------------------ Simple aggregations ----------------------------------------------------------

export async function getUserCycleDuration(userId?: string, fallback = 7) {
  if (!userId) return fallback
  return (await getUserCycleSettings(userId)).cycleDuration
}

export async function getUserSweetDessertLimit(userId?: string, fallback = 3) {
  if (!userId) return fallback
  return (await getUserCycleSettings(userId)).sweetDessertLimit
}

export function countSweetDessertsInCurrentCycle(meals: Meal[] = [], cycleDuration = 7): number {
  if (!meals.length) return 0
  const now = new Date()
  const since = new Date(now.getTime() - cycleDuration * 24 * 60 * 60 * 1000)
  return meals.reduce((n, m) => {
    if (m.meal_type !== "postre1" || !m.created_at) return n
    const d = new Date(m.created_at)
    return d >= since && d <= now ? n + 1 : n
  }, 0)
}

// ------------------ Cycle maths ------------------------------------------------------------------

export function calculateCycleInfo(today: Date, firstMealDate: Date, cycleDuration: number, cycleStartDay: number = 1) {
  // Find the most recent cycle start before or equal to today
  const mostRecentCycleStart = getLastCycleStart(today, cycleStartDay)
  const dayDiff = Math.floor((mostRecentCycleStart.getTime() - firstMealDate.getTime()) / 86400000)
  const cycleNumber = Math.floor(dayDiff / cycleDuration) + 1
  const daysSinceCycleStart = Math.floor((today.getTime() - mostRecentCycleStart.getTime()) / 86400000)
  const daysLeft = cycleDuration - daysSinceCycleStart
  return { cycleNumber, daysLeft }
}

export function getCycleInfo(): CycleInfo {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const progress = (now.getTime() - start.getTime()) / (end.getTime() - start.getTime())
  return { cycleNumber: now.getMonth() + 1, startDate: start, endDate: end, progress }
}

// groupMealsByCycle  (used by history & share pages)
export function groupMealsByCycle(meals: Meal[] = [], cycleDuration = 7, cycleStartDay = 1): CycleGroup[] {
  if (!meals.length) return []

  // Sort old→new (easier to slice ranges)
  const sorted = [...meals].sort(
    (a, b) => new Date(a.date ?? a.created_at ?? 0).getTime() - new Date(b.date ?? b.created_at ?? 0).getTime(),
  )

  // CAMBIO: El ciclo más reciente se alinea al último cycleStartDay anterior o igual a HOY
  const today = new Date()
  const mostRecentCycleStart = getLastCycleStart(today, cycleStartDay)

  const oldest = new Date(sorted[0].date ?? sorted[0].created_at ?? Date.now())

  // How many cycles do we need to walk back to cover everything?
  const totalDays = Math.ceil((mostRecentCycleStart.getTime() - oldest.getTime()) / 86400000)
  const cyclesNeeded = Math.ceil(totalDays / cycleDuration) + 1

  const groups: CycleGroup[] = []

  for (let i = 0; i < cyclesNeeded; i++) {
    const start = new Date(mostRecentCycleStart)
    start.setDate(start.getDate() - i * cycleDuration)
    const end = new Date(start)
    end.setDate(end.getDate() + cycleDuration - 1)

    const startISO = formatISO(start)
    const endISO = formatISO(end)

    // Build a bucket for each day
    const dayBuckets: Record<string, Meal[]> = {}
    for (let d = 0; d < cycleDuration; d++) {
      const day = new Date(start)
      day.setDate(start.getDate() + d)
      dayBuckets[formatISO(day)] = []
    }

    // Allocate meals into buckets
    for (const meal of sorted) {
      const mealISO = formatISO(new Date(meal.date ?? meal.created_at ?? Date.now()))
      if (mealISO >= startISO && mealISO <= endISO) {
        dayBuckets[mealISO]?.push(meal)
      }
    }

    // Convert to array & prettify
    const days: CycleGroupDay[] = Object.entries(dayBuckets).map(([iso, dayMeals]) => ({
      date: iso,
      displayDate: toDisplayDate(new Date(iso)).replace(/^./, (c) => c.toUpperCase()),
      meals: dayMeals,
    }))

    // Only include cycles that actually contain meals
    if (days.some((d) => d.meals.length)) {
      groups.push({
        cycleNumber: i + 1,
        startDate: startISO,
        endDate: endISO,
        displayDateRange: `Ciclo ${i + 1}: ${start.toLocaleDateString("es-ES", {
          day: "numeric",
          month: "short",
        })} - ${end.toLocaleDateString("es-ES", { day: "numeric", month: "short" })}`,
        days: days.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      })
    }
  }

  return groups
}

// ------------------ Back-compat exports ----------------------------------------------------------

export { getCycleInfo as getCurrentCycleInfo } // legacy alias
