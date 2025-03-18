"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { getMealTypeLabel } from "@/lib/utils"
import type { Meal } from "@/lib/local-storage"
import { toPng } from "html-to-image"

interface ShareableImageGeneratorProps {
  meal: Meal
  onImageGenerated: (imageUrl: string) => void
  onError: (error: Error) => void
}

export default function ShareableImageGenerator({ meal, onImageGenerated, onError }: ShareableImageGeneratorProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [imageLoaded, setImageLoaded] = useState(!meal.photo_url)

  // Generate image when component mounts and image is loaded
  useEffect(() => {
    if (!cardRef.current || !imageLoaded) return

    const generateImage = async () => {
      try {
        // Wait a bit to ensure everything is rendered
        await new Promise((resolve) => setTimeout(resolve, 100))

        const dataUrl = await toPng(cardRef.current!, {
          quality: 1,
          pixelRatio: 2,
          cacheBust: true,
        })

        onImageGenerated(dataUrl)
      } catch (error) {
        console.error("Error generating image:", error)
        onError(error instanceof Error ? error : new Error("Failed to generate image"))
      }
    }

    generateImage()
  }, [meal, imageLoaded, onImageGenerated, onError])

  const date = meal.created_at ? parseISO(meal.created_at) : new Date()
  const formattedDate = format(date, "EEEE, d 'de' MMMM", { locale: es })
  const formattedTime = format(date, "HH:mm")

  return (
    <div className="fixed left-[-9999px] top-0 z-[-1]">
      <div ref={cardRef} className="w-[400px] bg-white">
        <Card className="overflow-hidden border shadow-md">
          <CardHeader className="p-4 bg-teal-50 border-b">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-teal-800">NutriApp</h3>
              <div className="text-sm text-teal-600">
                {formattedDate} • {formattedTime}
              </div>
            </div>
          </CardHeader>

          {meal.photo_url && (
            <div className="aspect-video w-full">
              <img
                src={meal.photo_url || "/placeholder.svg"}
                alt={meal.description}
                className="w-full h-full object-cover"
                onLoad={() => setImageLoaded(true)}
                crossOrigin="anonymous"
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
      </div>
    </div>
  )
}

