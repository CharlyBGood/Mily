import { notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getSupabaseClient } from "@/lib/supabase-client"
import { groupMealsByCycle } from "@/lib/cycle-utils"
import MealShareCard from "@/components/meal-share-card"
import * as settingsService from "@/lib/settings-service"

export const dynamic = "force-dynamic"

async function getUserMeals(userId: string) {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from("meals")
    .select("*")
    .eq("user_id", userId)
    .eq("is_public", true)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching shared meals:", error)
    return []
  }

  return data || []
}

export default async function SharedMealsPage({ params }: { params: { userId: string } }) {
  const userId = params.userId

  // Get user settings for cycle configuration
  const settings = await settingsService.getUserSettings(userId)
  const cycleDuration = settings.cycleDuration
  const cycleStartDay = settings.cycleStartDay

  // Get user's public meals
  const meals = await getUserMeals(userId)

  if (!meals || meals.length === 0) {
    return notFound()
  }

  // Get username if available
  const username = await settingsService.getUsernameById(userId)

  // Group meals by cycle
  const cycleGroups = groupMealsByCycle(meals, cycleDuration, cycleStartDay)

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>
            {username ? `Comidas compartidas por ${username}` : "Comidas compartidas"}
            {cycleGroups.length > 0 && ` - Ciclo actual: ${cycleGroups[0].cycleNumber}`}
          </CardTitle>
          <CardDescription>
            Visualiza las comidas compartidas organizadas por ciclos de {cycleDuration} días
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={cycleGroups[0]?.cycleNumber.toString() || "1"} className="w-full">
            <TabsList className="mb-4 flex flex-wrap">
              {cycleGroups.map((group) => (
                <TabsTrigger key={group.cycleNumber} value={group.cycleNumber.toString()} className="mb-1">
                  {group.cycleNumber === cycleGroups[0].cycleNumber ? "Ciclo actual" : `Ciclo ${group.cycleNumber}`}
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
                    <MealShareCard key={meal.id} meal={meal} />
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
