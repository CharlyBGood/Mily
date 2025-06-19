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
    setImageLoaded(true)
    setImageError(false)
  }

  const handleImageError = () => {
    setImageError(true)
    setImageLoaded(false)
    console.error("Error loading image:", meal.photo_url)
  }

  // Direct photo click handler
  const handlePhotoClick = () => {
    if (meal.photo_url && !isPdfMode) {
      setShowPhotoViewer(true)
    }
  }

  const getMealTypeColor = (mealType: string) => {
    switch (mealType) {
      case "breakfast":
        return "bg-amber-50 text-amber-700 border border-amber-200"
      case "lunch":
        return "bg-emerald-50 text-emerald-700 border border-emerald-200"
      case "dinner":
        return "bg-purple-50 text-purple-700 border border-purple-200"
      case "snack":
        return "bg-pink-50 text-pink-700 border border-pink-200"
      default:
        return "bg-gray-50 text-gray-700 border border-gray-200"
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

  return (
    <>
      <Card
        className={`group overflow-hidden bg-white border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 w-full ${isPdfMode ? "pdf-meal-card" : ""}`}
      >
        {/* Photo Section */}
        {meal.photo_url && !imageError && (
          <div
            className="relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 cursor-pointer"
            onClick={handlePhotoClick}
          >
            <div className="aspect-square w-full">
              <img
                ref={imageRef}
                src={meal.photo_url || "/placeholder.svg"}
                alt={meal.description}
                className={`w-full h-full object-cover transition-all duration-500 ${
                  isPdfMode ? "pdf-image" : "group-hover:scale-105"
                }`}
                onLoad={handleImageLoad}
                onError={handleImageError}
                crossOrigin="anonymous"
              />
            </div>

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Meal type badge */}
            <div className="absolute top-3 left-3">
              <Badge
                className={`${getMealTypeColor(meal.meal_type)} font-medium text-xs px-2.5 py-1 shadow-sm backdrop-blur-sm`}
              >
                {getMealTypeLabel(meal.meal_type)}
              </Badge>
            </div>

            {/* Time badge */}
            {showTime && formattedTime && (
              <div className="absolute top-3 right-3">
                <Badge
                  variant="secondary"
                  className="bg-white/90 text-gray-700 font-medium text-xs px-2.5 py-1 shadow-sm backdrop-blur-sm border border-white/20"
                >
                  <Clock className="w-3 h-3 mr-1" />
                  {formattedTime}
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Content Section */}
        <CardContent className="p-4 space-y-3">
          {/* Title and Date */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg text-gray-900 leading-tight line-clamp-2">{meal.description}</h3>

            {/* Date info */}
            {showTime && formattedDate && (
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                <span className="font-medium">{formattedDate}</span>
              </div>
            )}
          </div>

          {/* Notes */}
          {meal.notes && (
            <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-teal-400">
              <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">{meal.notes}</p>
            </div>
          )}
        </CardContent>

        {/* Actions Footer */}
        {!isPdfMode && (showDeleteButton || showEditButton) && (onDelete || onEdit) && (
          <CardFooter className="px-4 py-3 bg-gray-50/80 border-t border-gray-100">
            <div className="flex justify-end space-x-2 w-full">
              {showEditButton && onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 h-9 px-4 rounded-lg font-medium transition-all duration-200 flex items-center"
                  onClick={handleEdit}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  <span>Editar</span>
                </Button>
              )}

              {showDeleteButton && onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 h-9 px-4 rounded-lg font-medium transition-all duration-200 flex items-center"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  <span>Eliminar</span>
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
