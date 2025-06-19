export type MealType = "desayuno" | "colacion1" | "almuerzo" | "postre1" | "postre2" | "merienda" | "colacion2" | "cena"

export interface Meal {
  id?: string
  user_id?: string
  description: string
  meal_type: MealType
  photo_url?: string
  notes?: string
  date?: string
  created_at?: string
  updated_at?: string
  metadata?: {
    dessert_type?: string
    [key: string]: any
  }
}

export interface UserCycleSettings {
  cycleDuration: number
  cycleStartDay: number
  sweetDessertLimit: number
}

export interface StorageResult<T = any> {
  success: boolean
  data?: T
  error?: {
    message: string
    code?: string
  }
}

export interface MealFormData {
  description: string
  meal_type: MealType
  photo?: File
  notes?: string
}

export interface ShareableContent {
  meals: Meal[]
  username?: string
  dateRange?: string
  cycleInfo?: {
    duration: number
    startDay: number
  }
}
