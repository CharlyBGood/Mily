import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Meal } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function groupMealsByDay(meals: Meal[] = []) {
  if (!meals || !Array.isArray(meals)) {
    console.error("Invalid meals data:", meals)
    return []
  }

  try {
    // Create a map to group meals by date
    const mealsByDate = new Map<string, Meal[]>()

    // Group meals by date
    for (const meal of meals) {
      if (!meal) continue

      // Use created_at or date field
      const mealDate = meal.created_at || meal.date
      if (!mealDate) continue

      // Format date as YYYY-MM-DD
      const dateObj = new Date(mealDate)
      const dateStr = dateObj.toISOString().split("T")[0]

      // Add meal to the appropriate date group
      if (!mealsByDate.has(dateStr)) {
        mealsByDate.set(dateStr, [])
      }
      mealsByDate.get(dateStr)?.push(meal)
    }

    // Convert map to array and sort by date (newest first)
    const groupedMeals = Array.from(mealsByDate.entries())
      .map(([date, dayMeals]) => {
        const dateObj = new Date(date)
        return {
          date,
          dateObj,
          displayDate: formatDate(dateObj),
          meals: dayMeals,
        }
      })
      .sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime())

    return groupedMeals
  } catch (error) {
    console.error("Error grouping meals by day:", error)
    return []
  }
}

export function getRandomId(): string {
  return Math.random().toString(36).substring(2, 15)
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return bytes + " bytes"
  } else if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + " KB"
  } else {
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }
}

export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

export function getMealTypeLabel(mealType: string): string {
  switch (mealType) {
    case "desayuno":
      return "Desayuno"
    case "colacion1":
      return "Colación"
    case "almuerzo":
      return "Almuerzo"
    case "postre1":
      return "Postre"
    case "merienda":
      return "Merienda"
    case "colacion2":
      return "Colación"
    case "cena":
      return "Cena"
    case "postre2":
      return "Postre"
    default:
      return "Comida"
  }
}
