import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react"
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
  version: number // Nuevo: para forzar reactividad en consumidores
}

const CycleSettingsContext = createContext<CycleSettingsContextProps | undefined>(undefined)

export const CycleSettingsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth()
  const [cycleStartDay, setCycleStartDay] = useState<number | null>(null)
  const [cycleDuration, setCycleDuration] = useState<number | null>(null)
  const [sweetDessertLimit, setSweetDessertLimit] = useState<number | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [version, setVersion] = useState(0) // Para forzar rerender
  const lastUserIdRef = useRef<string | null>(null)
  const lastSettingsRef = useRef<{ cycleStartDay: number, cycleDuration: number, sweetDessertLimit: number } | null>(null)

  const reloadSettings = async () => {
    if (!user) return
    try {
      const settings = await getUserCycleSettings(user.id)
      setCycleStartDay(Number(settings.cycleStartDay))
      setCycleDuration(settings.cycleDuration)
      setSweetDessertLimit(settings.sweetDessertLimit)
      setLoaded(true)
      // Solo actualiza version si los settings realmente cambiaron
      const last = lastSettingsRef.current
      if (!last || last.cycleStartDay !== settings.cycleStartDay || last.cycleDuration !== settings.cycleDuration || last.sweetDessertLimit !== settings.sweetDessertLimit) {
        setVersion(v => v + 1)
        lastSettingsRef.current = settings
      }
    } catch (e) {
      setCycleStartDay(1)
      setCycleDuration(7)
      setSweetDessertLimit(3)
      setLoaded(true)
      setVersion(v => v + 1)
      lastSettingsRef.current = { cycleStartDay: 1, cycleDuration: 7, sweetDessertLimit: 3 }
    }
  }

  useEffect(() => {
    // Solo recargar settings si el user.id realmente cambió
    if (user?.id && lastUserIdRef.current !== user.id) {
      lastUserIdRef.current = user.id
      reloadSettings()
    }
    // Escucha storage para sincronizar entre pestañas
    const handler = (e: StorageEvent) => {
      if (e.key === "cycleSettingsUpdated") {
        reloadSettings()
      }
    }
    window.addEventListener("storage", handler)
    return () => window.removeEventListener("storage", handler)
  }, [user?.id])

  return (
    <CycleSettingsContext.Provider value={{
      cycleStartDay: cycleStartDay ?? 1,
      cycleDuration: cycleDuration ?? 7,
      sweetDessertLimit: sweetDessertLimit ?? 3,
      setCycleStartDay: (d) => setCycleStartDay(d),
      setCycleDuration: (d) => setCycleDuration(d),
      reloadSettings,
      loaded,
      version
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
