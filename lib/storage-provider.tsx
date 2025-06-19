"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useAuth } from "./auth-context"
import * as localStorageService from "./local-storage"
import * as supabaseService from "./meal-service"
import type { Meal } from "./types"

type StorageType = "local" | "supabase"

interface StorageContextType {
  storageType: StorageType
  setStorageType: (type: StorageType) => void
  saveMeal: (meal: Meal) => Promise<{ success: boolean; data?: Meal; error?: any }>
  getUserMeals: () => Promise<{ success: boolean; data?: Meal[]; error?: any }>
  getMealById: (id: string) => Promise<{ success: boolean; data?: Meal; error?: any }>
  deleteMeal: (id: string) => Promise<{ success: boolean; error?: any }>
  uploadImage: (file: File) => Promise<string>
  isLoading: boolean
}

const StorageContext = createContext<StorageContextType | undefined>(undefined)

export function StorageProvider({ children }: { children: ReactNode }) {
  const [storageType, setStorageType] = useState<StorageType>("local")
  const [isLoading, setIsLoading] = useState(true)
  const [isBrowser, setIsBrowser] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    setIsBrowser(true)
  }, [])

  useEffect(() => {
    if (!isBrowser) return

    const checkStorageType = async () => {
      setIsLoading(true)

      if (user) {
        try {
          const { success, data } = await supabaseService.getUserMeals()

          if (success && data && data.length > 0) {
            setStorageType("supabase")
          } else {
            const { success: localSuccess, data: localData } = await localStorageService.getUserMeals()

            if (localSuccess && localData && localData.length > 0) {
              setStorageType("local")
            } else {
              setStorageType("supabase")
            }
          }
        } catch (error) {
          console.error("Error checking storage type:", error)
          setStorageType("local")
        }
      } else {
        setStorageType("local")
      }

      setIsLoading(false)
    }

    checkStorageType()
  }, [user, isBrowser])

  const saveMeal = async (meal: Meal) => {
    if (storageType === "supabase" && user) {
      return supabaseService.saveMeal(meal)
    } else {
      return localStorageService.saveMeal(meal)
    }
  }

  const getUserMeals = async () => {
    if (storageType === "supabase" && user) {
      return supabaseService.getUserMeals()
    } else {
      return localStorageService.getUserMeals()
    }
  }

  const getMealById = async (id: string) => {
    if (storageType === "supabase" && user) {
      return supabaseService.getMealById(id)
    } else {
      return localStorageService.getMealById(id)
    }
  }

  const deleteMeal = async (id: string) => {
    if (storageType === "supabase" && user) {
      return supabaseService.deleteMeal(id)
    } else {
      return localStorageService.deleteMeal(id)
    }
  }

  const uploadImage = async (file: File) => {
    if (storageType === "supabase" && user) {
      return supabaseService.uploadImage(file)
    } else {
      return localStorageService.savePhotoToLocalStorage(file)
    }
  }

  const value = {
    storageType,
    setStorageType,
    saveMeal,
    getUserMeals,
    getMealById,
    deleteMeal,
    uploadImage,
    isLoading,
  }

  return <StorageContext.Provider value={value}>{children}</StorageContext.Provider>
}

export function useStorage() {
  const context = useContext(StorageContext)
  if (context === undefined) {
    throw new Error("useStorage must be used within a StorageProvider")
  }
  return context
}

// Export alias for backward compatibility
export const useStorageProvider = () => {
  const storage = useStorage()
  return { storageProvider: storage }
}
