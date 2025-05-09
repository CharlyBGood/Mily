"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useStorage } from "@/lib/storage-provider"
import { groupMealsByCycle } from "@/lib/cycle-utils"
import type { Meal } from "@/lib/types"
import MealCard from "./meal-card"
import * as settingsService from "@/lib/settings-service"

export default function CycleSection() {
  const [meals, setMeals] = useState<Meal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [cycleDuration, setCycleDuration] = useState(7)
  const [cycleStartDay, setCycleStartDay] = useState(1) // Default to Monday
  const { user } = useAuth()
  const { getUserMeals } = useStorage()

  useEffect(() => {
    const loadSettings = async () => {
      if (user?.id) {
        try {
          const settings = await settingsService.getUserSettings(user.id)
          setCycleDuration(settings.cycleDuration)
          setCycleStartDay(settings.cycleStartDay)
        } catch (error) {
          console.error("Error loading cycle settings:", error)
          // Use defaults if settings can't be loaded
          setCycleDuration(7)
          setCycleStartDay(1)
        }
      }
    }

    loadSettings()
  }, [user])

  useEffect(() => {
    const loadMeals = async () => {
      setIsLoading(true)
      try {
        const { success, data } = await getUserMeals()
        if (success && data) {
          setMeals(data)
        }
      } catch (error) {
        console.error("Error loading meals:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadMeals()
  }, [getUserMeals])

  // Group meals by cycle
  const cycleGroups = groupMealsByCycle(meals, cycleDuration, cycleStartDay)

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (meals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ciclos Nutricionales</CardTitle>
          <CardDescription>
            Aún no tienes comidas registradas. Comienza a registrar tus comidas para ver tus ciclos nutricionales.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ciclos Nutricionales</CardTitle>
        <CardDescription>Visualiza tus comidas organizadas por ciclos de {cycleDuration} días</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={cycleGroups[0]?.cycleNumber.toString() || "1"} className="w-full">
          <TabsList className="mb-4 flex flex-wrap">
            {cycleGroups.map((group) => (
              <TabsTrigger key={group.cycleNumber} value={group.cycleNumber.toString()} className="mb-1">
                Ciclo {group.cycleNumber}
              </TabsTrigger>
            ))}
          </TabsList>

          {cycleGroups.map((group) => (
            <TabsContent key={group.cycleNumber} value={group.cycleNumber.toString()}>
              <div className="mb-4">
                <h3 className="text-sm font-medium text-muted-foreground">{group.displayDateRange}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.meals.map((meal) => (
                  <MealCard key={meal.id} meal={meal} />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}
