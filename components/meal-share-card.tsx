"use client"

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { getMealTypeLabel } from "@/lib/utils"
import type { Meal } from "@/lib/types"
import MilyLogo from "./mily-logo"
import { useEffect, useState, useRef } from "react"

type MealShareCardProps = {
  meal: Meal
}

export default function MealShareCard({ meal }: MealShareCardProps) {
  const date = meal.created_at ? parseISO(meal.created_at) : new Date()
  const formattedDate = format(date, "EEEE, d 'de' MMMM", { locale: es })
  const formattedTime = format(date, "HH:mm")

  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [imageDimensions, setImageDimensions] = useState({ width: "auto", height: "auto" })
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleImageLoad = () => {
    if (imageRef.current) {
      // Calculate appropriate dimensions based on container width
      calculateImageDimensions()
    }

    setImageLoaded(true)
    setImageError(false)
  }

  const handleImageError = () => {
    setImageError(true)
    setImageLoaded(false)
    console.error("Error loading image:", meal.photo_url)
  }

  // Calculate appropriate image dimensions based on container width
  const calculateImageDimensions = () => {
    if (!imageRef.current || !containerRef.current) return

    const containerWidth = containerRef.current.clientWidth
    const naturalWidth = imageRef.current.naturalWidth
    const naturalHeight = imageRef.current.naturalHeight

    // If image is smaller than container, display at original size
    if (naturalWidth <= containerWidth) {
      setImageDimensions({
        width: `${naturalWidth}px`,
        height: `${naturalHeight}px`,
      })
    } else {
      // Otherwise, scale down to fit container width while maintaining aspect ratio
      const aspectRatio = naturalWidth / naturalHeight
      const scaledHeight = containerWidth / aspectRatio

      setImageDimensions({
        width: "100%",
        height: `${scaledHeight}px`,
      })
    }
  }

  // Recalculate dimensions on window resize
  useEffect(() => {
    const handleResize = () => {
      calculateImageDimensions()
    }

    window.addEventListener("resize", handleResize)

    // Initial calculation
    if (imageLoaded && imageRef.current) {
      calculateImageDimensions()
    }

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [imageLoaded])

  return (
    <Card className="overflow-hidden max-w-md mx-auto">
      <CardHeader className="p-4 bg-teal-50 border-b">
        <div className="flex justify-between items-center">
          <div className="w-32">
            <MilyLogo className="w-full h-auto" />
          </div>
          <div className="text-base text-teal-600">
            {formattedDate} • {formattedTime}
          </div>
        </div>
      </CardHeader>
      {meal.photo_url && !imageError && (
        <div ref={containerRef} className="bg-white flex justify-center w-full">
          <img
            ref={imageRef}
            src={meal.photo_url || "/placeholder.svg"}
            alt={meal.description}
            className="object-contain"
            style={{
              width: imageDimensions.width,
              height: imageDimensions.height,
              maxWidth: "100%",
              display: "block",
            }}
            onLoad={handleImageLoad}
            onError={handleImageError}
            crossOrigin="anonymous"
          />
        </div>
      )}
      <CardContent className="p-4">
        <div className="mb-1 inline-block px-2 py-0.5 bg-teal-100 text-teal-800 text-base rounded">
          {getMealTypeLabel(meal.meal_type)}
        </div>
        <h3 className="text-xl font-medium mt-2">{meal.description}</h3>
        {meal.notes && <p className="mt-2 text-neutral-600 text-base">{meal.notes}</p>}
      </CardContent>
      <CardFooter className="px-4 py-3 bg-neutral-50 border-t text-center text-sm text-neutral-500">
        Registrado con Mily
      </CardFooter>
    </Card>
  )
}
