"use client"

import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2, Edit } from "lucide-react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { getMealTypeLabel } from "@/lib/utils"
import type { Meal } from "@/lib/types"
import { useEffect, useState, useRef } from "react"

interface MealCardProps {
  meal: Meal
  onDelete?: (meal: Meal) => void
  onEdit?: (meal: Meal) => void
  showDeleteButton?: boolean
  showEditButton?: boolean
  showTime?: boolean
  isPdfMode?: boolean
}

export default function MealCard({
  meal,
  onDelete,
  onEdit,
  showDeleteButton = true,
  showEditButton = true,
  showTime = true,
  isPdfMode = false,
}: MealCardProps) {
  let formattedDate = ""
  let formattedTime = ""
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [imageDimensions, setImageDimensions] = useState({ width: "auto", height: "auto" })
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  if (showTime && meal.created_at) {
    try {
      const date = parseISO(meal.created_at)
      formattedDate = format(date, "EEEE, d 'de' MMMM", { locale: es })
      formattedTime = format(date, "HH:mm")
    } catch (error) {
      console.error("Error formatting date:", error)
      formattedDate = "Fecha desconocida"
      formattedTime = ""
    }
  }

  const handleDelete = () => {
    if (onDelete && meal) {
      onDelete(meal)
    }
  }

  const handleEdit = () => {
    if (onEdit && meal) {
      onEdit(meal)
    }
  }

  const handleImageLoad = () => {
    if (imageRef.current) {
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

  const calculateImageDimensions = () => {
    if (!imageRef.current || !containerRef.current) return

    const containerWidth = containerRef.current.clientWidth
    const naturalWidth = imageRef.current.naturalWidth
    const naturalHeight = imageRef.current.naturalHeight

    if (naturalWidth <= containerWidth) {
      setImageDimensions({
        width: `${naturalWidth}px`,
        height: `${naturalHeight}px`,
      })
    } else {
      const aspectRatio = naturalWidth / naturalHeight
      const scaledHeight = containerWidth / aspectRatio

      setImageDimensions({
        width: "100%",
        height: `${scaledHeight}px`,
      })
    }
  }

  useEffect(() => {
    const handleResize = () => {
      calculateImageDimensions()
    }

    window.addEventListener("resize", handleResize)

    if (imageLoaded && imageRef.current) {
      calculateImageDimensions()
    }

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [imageLoaded])

  useEffect(() => {
    if (isPdfMode && meal.photo_url && imageRef.current) {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        if (imageRef.current) {
          imageRef.current.src = meal.photo_url || ""
          setImageLoaded(true)
        }
      }
      img.onerror = handleImageError
      img.src = meal.photo_url
    }
  }, [isPdfMode, meal.photo_url])

  return (
    <Card className={`overflow-hidden shadow-sm w-full max-w-md mx-auto mb-4 ${isPdfMode ? "pdf-meal-card" : ""}`}>
      {meal.photo_url && !imageError && (
        <div ref={containerRef} className="bg-white flex justify-center w-full meal-image-container">
          <img
            ref={imageRef}
            src={meal.photo_url || "/placeholder.svg"}
            alt={meal.description}
            className={`object-contain ${isPdfMode ? "pdf-image" : ""}`}
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
      <CardContent className={`p-4 ${isPdfMode ? "card-content" : ""}`}>
        <div className="flex flex-col mb-2">
          <h3 className="font-medium text-xl">{meal.description}</h3>
          <div className="text-base font-medium text-teal-600 mt-1">{getMealTypeLabel(meal.meal_type)}</div>
          {showTime && formattedDate && formattedTime && (
            <div className="text-base text-neutral-500 mt-2 font-medium">
              {formattedDate} • {formattedTime}
            </div>
          )}
        </div>

        {meal.notes && <div className="mt-3 text-base text-neutral-600">{meal.notes}</div>}
      </CardContent>

      {!isPdfMode && (showDeleteButton || showEditButton) && (onDelete || onEdit) && (
        <CardFooter className="px-4 py-3 border-t bg-neutral-50 flex justify-between">
          <div className="flex space-x-2">
            {showEditButton && onEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                onClick={handleEdit}
              >
                <Edit className="h-4 w-4 mr-1" />
                <span>Editar</span>
              </Button>
            )}

            {showDeleteButton && onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                <span>Eliminar</span>
              </Button>
            )}
          </div>
        </CardFooter>
      )}
    </Card>
  )
}
