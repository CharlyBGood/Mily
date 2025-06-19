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
    const mealsByDate = new Map<string, Meal[]>()

    for (const meal of meals) {
      if (!meal) continue

      const mealDate = meal.created_at || meal.date
      if (!mealDate) continue

      const dateObj = new Date(mealDate)
      const dateStr = dateObj.toISOString().split("T")[0]

      if (!mealsByDate.has(dateStr)) {
        mealsByDate.set(dateStr, [])
      }
      mealsByDate.get(dateStr)?.push(meal)
    }

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
