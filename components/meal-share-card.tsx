import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { getMealTypeLabel } from "@/lib/utils"
import type { Meal } from "@/lib/local-storage"

type MealShareCardProps = {
  meal: Meal
}

export default function MealShareCard({ meal }: MealShareCardProps) {
  const date = meal.created_at ? parseISO(meal.created_at) : new Date()
  const formattedDate = format(date, "EEEE, d 'de' MMMM", { locale: es })
  const formattedTime = format(date, "HH:mm")

  return (
    <Card className="overflow-hidden max-w-md">
      <CardHeader className="p-4 bg-teal-50 border-b">
        <div className="flex justify-between items-center">
          <h3 className="font-medium text-teal-800">NutriApp</h3>
          <div className="text-sm text-teal-600">
            {formattedDate} • {formattedTime}
          </div>
        </div>
      </CardHeader>
      {meal.photo_url && (
        <div className="aspect-video">
          <img
            src={meal.photo_url || "/placeholder.svg"}
            alt={meal.description}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <CardContent className="p-4">
        <div className="mb-1 inline-block px-2 py-0.5 bg-teal-100 text-teal-800 text-sm rounded">
          {getMealTypeLabel(meal.meal_type)}
        </div>
        <h3 className="text-lg font-medium mt-2">{meal.description}</h3>
        {meal.notes && <p className="mt-2 text-neutral-600">{meal.notes}</p>}
      </CardContent>
      <CardFooter className="px-4 py-3 bg-neutral-50 border-t text-center text-sm text-neutral-500">
        Registrado con NutriApp
      </CardFooter>
    </Card>
  )
}

