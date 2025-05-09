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

  // Set isBrowser flag
  useEffect(() => {
    setIsBrowser(true)
  }, [])

  // Determine storage type based on user authentication
  useEffect(() => {
    // Skip on server-side
    if (!isBrowser) return

    const checkStorageType = async () => {
      setIsLoading(true)
      console.log("StorageProvider: Checking storage type, user:", user?.id)

      // If user is logged in, use Supabase
      if (user) {
        // Check if user has any meals in Supabase
        try {
          console.log("StorageProvider: User is logged in, checking Supabase meals")
          const { success, data } = await supabaseService.getUserMeals()
          console.log("StorageProvider: Supabase meals check result:", { success, dataLength: data?.length })

          if (success && data && data.length > 0) {
            console.log("StorageProvider: User has meals in Supabase, using Supabase storage")
            setStorageType("supabase")
          } else {
            // No meals in Supabase, check localStorage
            console.log("StorageProvider: No meals in Supabase, checking localStorage")
            const { success: localSuccess, data: localData } = await localStorageService.getUserMeals()
            console.log("StorageProvider: localStorage check result:", { localSuccess, dataLength: localData?.length })

            if (localSuccess && localData && localData.length > 0) {
              // User has local data but is logged in - keep using local until migration
              console.log("StorageProvider: User has local data, using local storage until migration")
              setStorageType("local")
            } else {
              // No data anywhere, but user is logged in - use Supabase
              console.log("StorageProvider: No data anywhere, using Supabase storage")
              setStorageType("supabase")
            }
          }
        } catch (error) {
          console.error("StorageProvider: Error checking storage type:", error)
          // Default to localStorage on error
          setStorageType("local")
        }
      } else {
        // Not logged in, use localStorage
        console.log("StorageProvider: User not logged in, using local storage")
        setStorageType("local")
      }

      setIsLoading(false)
    }

    checkStorageType()
  }, [user, isBrowser])

  // Proxy functions that delegate to the appropriate storage service
  const saveMeal = async (meal: Meal) => {
    console.log("StorageProvider: Saving meal using", storageType, "storage")
    if (storageType === "supabase" && user) {
      return supabaseService.saveMeal(meal)
    } else {
      return localStorageService.saveMeal(meal)
    }
  }

  const getUserMeals = async () => {
    console.log("StorageProvider: Getting user meals using", storageType, "storage")
    if (storageType === "supabase" && user) {
      return supabaseService.getUserMeals()
    } else {
      return localStorageService.getUserMeals()
    }
  }

  const getMealById = async (id: string) => {
    console.log("StorageProvider: Getting meal by ID using", storageType, "storage")
    if (storageType === "supabase" && user) {
      return supabaseService.getMealById(id)
    } else {
      return localStorageService.getMealById(id)
    }
  }

  const deleteMeal = async (id: string) => {
    console.log("StorageProvider: Deleting meal using", storageType, "storage")
    if (storageType === "supabase" && user) {
      return supabaseService.deleteMeal(id)
    } else {
      return localStorageService.deleteMeal(id)
    }
  }

  const uploadImage = async (file: File) => {
    console.log("StorageProvider: Uploading image using", storageType, "storage")
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
