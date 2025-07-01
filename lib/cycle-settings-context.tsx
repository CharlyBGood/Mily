import React, { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { getUserCycleSettings } from "@/lib/cycle-utils"
import { useAuth } from "@/lib/auth-context"

interface CycleSettingsContextProps {
  cycleStartDay: number
  cycleDuration: number
  sweetDessertLimit: number
  setCycleStartDay: (day: number) => void
  setCycleDuration: (duration: number) => void
  reloadSettings: () => Promise<void>
  loaded: boolean
}

const CycleSettingsContext = createContext<CycleSettingsContextProps | undefined>(undefined)

export const CycleSettingsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth()
  const [cycleStartDay, setCycleStartDay] = useState<number | null>(null)
  const [cycleDuration, setCycleDuration] = useState<number | null>(null)
  const [sweetDessertLimit, setSweetDessertLimit] = useState<number | null>(null)
  const [loaded, setLoaded] = useState(false)

  const reloadSettings = async () => {
    if (!user) return
    try {
      const settings = await getUserCycleSettings(user.id)
      setCycleStartDay(settings.cycleStartDay)
      setCycleDuration(settings.cycleDuration)
      setSweetDessertLimit(settings.sweetDessertLimit)
      setLoaded(true)
    } catch {
      setCycleStartDay(1)
      setCycleDuration(7)
      setSweetDessertLimit(3)
      setLoaded(true)
    }
  }

  useEffect(() => {
    if (user) reloadSettings()
    // Escucha storage para sincronizar entre pestañas
    const handler = (e: StorageEvent) => {
      if (e.key === "cycleSettingsUpdated") reloadSettings()
    }
    window.addEventListener("storage", handler)
    return () => window.removeEventListener("storage", handler)
  }, [user])

  return (
    <CycleSettingsContext.Provider value={{
      cycleStartDay: cycleStartDay ?? 1,
      cycleDuration: cycleDuration ?? 7,
      sweetDessertLimit: sweetDessertLimit ?? 3,
      setCycleStartDay: (d) => setCycleStartDay(d),
      setCycleDuration: (d) => setCycleDuration(d),
      reloadSettings,
      loaded
    }}>
      {children}
    </CycleSettingsContext.Provider>
  )
}

export const useCycleSettings = () => {
  const ctx = useContext(CycleSettingsContext)
  if (!ctx) throw new Error("useCycleSettings must be used within CycleSettingsProvider")
  return ctx
}
