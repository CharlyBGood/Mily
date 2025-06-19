"use client"

import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, Edit, Clock, Calendar } from "lucide-react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { getMealTypeLabel } from "@/lib/utils"
import type { Meal } from "@/lib/types"
import { useEffect, useState, useRef } from "react"
import PhotoViewer from "./photo-viewer"

interface MealCardProps {
  meal: Meal
  onDelete?: (meal: Meal) => void
  onEdit?: (meal: Meal) => void
  showDeleteButton?: boolean
  showEditButton?: boolean
  showTime?: boolean
  isPdfMode?: boolean
  isSharedView?: boolean
}

export default function MealCard({
  meal,
  onDelete,
  onEdit,
  showDeleteButton = true,
  showEditButton = true,
  showTime = true,
  isPdfMode = false,
  isSharedView = false,
}: MealCardProps) {
  let formattedDate = ""
  let formattedTime = ""
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [showPhotoViewer, setShowPhotoViewer] = useState(false)
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 })
  const imageRef = useRef<HTMLImageElement>(null)

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
      const { naturalWidth, naturalHeight } = imageRef.current
      setImageDimensions({ width: naturalWidth, height: naturalHeight })
    }
    setImageLoaded(true)
    setImageError(false)
  }

  const handleImageError = () => {
    setImageError(true)
    setImageLoaded(false)
    console.error("Error loading image:", meal.photo_url)
  }

  const handlePhotoClick = () => {
    if (meal.photo_url && !isPdfMode) {
      setShowPhotoViewer(true)
    }
  }

  const getMealTypeColor = (mealType: string) => {
    switch (mealType) {
      case "breakfast":
        return "bg-amber-100 text-amber-800 border-amber-200"
      case "lunch":
        return "bg-emerald-100 text-emerald-800 border-emerald-200"
      case "dinner":
        return "bg-purple-100 text-purple-800 border-purple-200"
      case "snack":
        return "bg-pink-100 text-pink-800 border-pink-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

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

  const getCardStyle = () => {
    if (!imageLoaded || !imageDimensions.width || isPdfMode) {
      return {}
    }

    const screenWidth = typeof window !== "undefined" ? window.innerWidth : 400

    if (screenWidth < 640) {
      return { width: "100%" }
    }

    const maxWidth = screenWidth < 1024 ? Math.min(screenWidth * 0.45, 500) : Math.min(screenWidth * 0.3, 400)
    const optimalWidth = Math.min(imageDimensions.width, maxWidth)

    return {
      width: `${optimalWidth}px`,
      minWidth: "280px",
      maxWidth: "100%",
    }
  }

  return (
    <>
      <Card
        className={`group overflow-hidden bg-white border border-gray-200 hover:border-teal-300 hover:shadow-lg transition-all duration-200 ${isPdfMode ? "pdf-meal-card" : ""}`}
        style={getCardStyle()}
      >
        {/* Photo Section */}
        {meal.photo_url && !imageError && (
          <div className="relative overflow-hidden bg-gray-50 cursor-pointer" onClick={handlePhotoClick}>
            <div className="w-full">
              <img
                ref={imageRef}
                src={meal.photo_url || "/placeholder.svg"}
                alt={meal.description}
                className={`w-full h-auto object-contain transition-transform duration-200 ${
                  isPdfMode ? "pdf-image" : "group-hover:scale-105"
                }`}
                style={{
                  display: "block",
                  maxWidth: "100%",
                  height: "auto",
                }}
                onLoad={handleImageLoad}
                onError={handleImageError}
                crossOrigin="anonymous"
              />
            </div>

            {/* Meal type badge */}
            <div className="absolute top-3 left-3">
              <Badge className={`${getMealTypeColor(meal.meal_type)} font-medium text-sm px-3 py-1 border`}>
                {getMealTypeLabel(meal.meal_type)}
              </Badge>
            </div>

            {/* Time badge */}
            {showTime && formattedTime && (
              <div className="absolute top-3 right-3">
                <Badge
                  variant="secondary"
                  className="bg-white text-gray-700 font-medium text-sm px-3 py-1 border border-gray-200"
                >
                  <Clock className="w-3 h-3 mr-1" />
                  {formattedTime}
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Content Section */}
        <CardContent className="p-4">
          <div className="space-y-3">
            <h3 className="font-semibold text-lg text-gray-900 leading-tight line-clamp-2">{meal.description}</h3>

            {/* Date info */}
            {showTime && formattedDate && (
              <div className="flex items-center text-sm text-gray-600 bg-gray-50 rounded-lg p-2">
                <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                <span className="font-medium">{formattedDate}</span>
              </div>
            )}

            {/* Notes */}
            {meal.notes && (
              <div className="bg-teal-50 rounded-lg p-3 border-l-4 border-teal-500">
                <p className="text-sm text-gray-700 leading-relaxed">{meal.notes}</p>
              </div>
            )}
          </div>
        </CardContent>

        {/* Actions Footer */}
        {!isPdfMode && (showDeleteButton || showEditButton) && (onDelete || onEdit) && (
          <CardFooter className="px-4 py-3 bg-gray-50 border-t">
            <div className="flex justify-end space-x-2 w-full">
              {showEditButton && onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 h-8 px-3 font-medium"
                  onClick={handleEdit}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
              )}

              {showDeleteButton && onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-3 font-medium"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Eliminar
                </Button>
              )}
            </div>
          </CardFooter>
        )}
      </Card>

      {/* Photo Viewer */}
      {meal.photo_url && (
        <PhotoViewer
          src={meal.photo_url}
          alt={meal.description}
          isOpen={showPhotoViewer}
          onClose={() => setShowPhotoViewer(false)}
        />
      )}
    </>
  )
}
