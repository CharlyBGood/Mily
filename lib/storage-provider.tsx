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
  const { user } = useAuth()

  // Determine storage type based on user authentication
  useEffect(() => {
    const checkStorageType = async () => {
      setIsLoading(true)

      // If user is logged in, use Supabase
      if (user) {
        // Check if user has any meals in Supabase
        try {
          const { success, data } = await supabaseService.getUserMeals()
          if (success && data && data.length > 0) {
            setStorageType("supabase")
          } else {
            // No meals in Supabase, check localStorage
            const { success: localSuccess, data: localData } = await localStorageService.getUserMeals()
            if (localSuccess && localData && localData.length > 0) {
              // User has local data but is logged in - keep using local until migration
              setStorageType("local")
            } else {
              // No data anywhere, but user is logged in - use Supabase
              setStorageType("supabase")
            }
          }
        } catch (error) {
          console.error("Error checking storage type:", error)
          // Default to localStorage on error
          setStorageType("local")
        }
      } else {
        // Not logged in, use localStorage
        setStorageType("local")
      }

      setIsLoading(false)
    }

    checkStorageType()
  }, [user])

  // Proxy functions that delegate to the appropriate storage service
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
