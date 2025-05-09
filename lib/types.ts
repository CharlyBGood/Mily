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

export interface UserCycleSettings {
  cycleDuration: number
  cycleStartDay: number
  sweetDessertLimit: number
}
