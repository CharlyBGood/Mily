"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp, Calendar, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { useStorage } from "@/lib/storage-provider"
import { useSettings } from "@/lib/settings-context"
import type { Meal } from "@/lib/types"
import {
  calculateCycleInfo,
  countSweetDessertsInCurrentCycle,
  formatNextCycleStartDate,
  calculateNextCycleStartDate,
} from "@/lib/cycle-utils"

export default function CycleSection() {
  const [meals, setMeals] = useState<Meal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cycleInfo, setCycleInfo] = useState<{
    cycleNumber: number
    startDate: Date
    endDate: Date
    daysLeft: number
    daysTotal: number
    sweetDessertsCount: number
    sweetDessertLimit: number
    nextCycleStart: string
  } | null>(null)

  const { user } = useAuth()
  const { getUserMeals } = useStorage()
  const { cycleSettings, isLoading: isLoadingSettings } = useSettings()

  useEffect(() => {
    if (!isLoadingSettings) {
      loadMeals()
    }
  }, [isLoadingSettings, cycleSettings])

  const loadMeals = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { success, data, error } = await getUserMeals()

      if (!success || !data) {
        throw new Error(error || "No se pudieron cargar las comidas")
      }

      setMeals(data)

      // Calculate cycle information
      if (data.length > 0) {
        // Sort meals by date (oldest first)
        const sortedMeals = [...data].sort((a, b) => {
          return new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime()
        })

        const firstMealDate = new Date(sortedMeals[0].created_at || "")
        const today = new Date()

        // Get cycle info using the settings
        const info = calculateCycleInfo(today, firstMealDate, cycleSettings.cycleDuration, cycleSettings.cycleStartDay)

        // Count sweet desserts in current cycle
        const sweetDessertsCount = countSweetDessertsInCurrentCycle(
          data,
          cycleSettings.cycleDuration,
          cycleSettings.cycleStartDay,
        )

        // Calculate next cycle start date
        const nextStartDate = calculateNextCycleStartDate(cycleSettings.cycleStartDay)
        const formattedNextStart = formatNextCycleStartDate(nextStartDate)

        setCycleInfo({
          ...info,
          daysTotal: cycleSettings.cycleDuration,
          sweetDessertsCount,
          sweetDessertLimit: cycleSettings.sweetDessertLimit,
          nextCycleStart: formattedNextStart,
        })
      } else {
        setCycleInfo(null)
      }
    } catch (err) {
      console.error("Error loading meals for cycle info:", err)
      setError("No se pudo cargar la información del ciclo")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRetry = () => {
    loadMeals()
  }

  if (isLoading || isLoadingSettings) {
    return (
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex justify-between items-center">
            <span>Ciclo actual</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-24 flex items-center justify-center">
            <div className="animate-pulse bg-gray-200 h-4 w-3/4 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button variant="outline" size="sm" className="ml-2" onClick={handleRetry}>
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (!cycleInfo) {
    return (
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Ciclo actual</CardTitle>
          <CardDescription>Aún no has registrado comidas</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Registra tu primera comida para comenzar a seguir tu ciclo nutricional.
          </p>
        </CardContent>
      </Card>
    )
  }

  const daysElapsed = cycleInfo.daysTotal - cycleInfo.daysLeft
  const progress = Math.round((daysElapsed / cycleInfo.daysTotal) * 100)
  const dessertProgress = Math.round((cycleInfo.sweetDessertsCount / cycleInfo.sweetDessertLimit) * 100)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-4">
      <Card>
        <CardHeader className="pb-2">
          <CollapsibleTrigger asChild>
            <CardTitle className="text-lg flex justify-between items-center cursor-pointer">
              <span>Ciclo {cycleInfo.cycleNumber}</span>
              {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </CardTitle>
          </CollapsibleTrigger>
          <CardDescription>
            {format(cycleInfo.startDate, "d 'de' MMMM", { locale: es })} -{" "}
            {format(cycleInfo.endDate, "d 'de' MMMM", { locale: es })}
          </CardDescription>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">
                  Día {daysElapsed} de {cycleInfo.daysTotal}
                </span>
                <span className="text-sm text-muted-foreground">
                  {cycleInfo.daysLeft} {cycleInfo.daysLeft === 1 ? "día" : "días"} restantes
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">Postres dulces</span>
                <span className="text-sm text-muted-foreground">
                  {cycleInfo.sweetDessertsCount} de {cycleInfo.sweetDessertLimit}
                </span>
              </div>
              <Progress
                value={dessertProgress}
                className={`h-2 ${cycleInfo.sweetDessertsCount >= cycleInfo.sweetDessertLimit ? "bg-red-200" : ""}`}
                indicatorClassName={
                  cycleInfo.sweetDessertsCount >= cycleInfo.sweetDessertLimit ? "bg-red-500" : undefined
                }
              />
            </div>

            <div className="flex items-center text-sm text-muted-foreground mt-2">
              <Calendar className="h-4 w-4 mr-1" />
              <span>Próximo ciclo: {cycleInfo.nextCycleStart}</span>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
