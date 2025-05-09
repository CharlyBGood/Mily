"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useAuth } from "./auth-context"
import * as settingsService from "./settings-service"
import type { UserCycleSettings } from "./types"

interface SettingsContextType {
  cycleSettings: UserCycleSettings
  isLoading: boolean
  error: string | null
  refreshSettings: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [cycleSettings, setCycleSettings] = useState<UserCycleSettings>({ ...settingsService.DEFAULT_SETTINGS })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      loadSettings()
    } else {
      // Reset to defaults if not logged in
      setCycleSettings({ ...settingsService.DEFAULT_SETTINGS })
      setIsLoading(false)
      setError(null)
    }
  }, [user])

  const loadSettings = async () => {
    if (!user) return

    setIsLoading(true)
    setError(null)

    try {
      const settings = await settingsService.getUserSettings(user.id)
      setCycleSettings(settings)
    } catch (err) {
      console.error("Error loading settings:", err)
      setError("No se pudieron cargar las configuraciones del ciclo")
      // Use defaults on error
      setCycleSettings({ ...settingsService.DEFAULT_SETTINGS })
    } finally {
      setIsLoading(false)
    }
  }

  const refreshSettings = async () => {
    await loadSettings()
  }

  return (
    <SettingsContext.Provider
      value={{
        cycleSettings,
        isLoading,
        error,
        refreshSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider")
  }
  return context
}
