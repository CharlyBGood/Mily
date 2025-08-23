"use client"

import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, Edit, Clock, Calendar } from "lucide-react"
import CommentButton from "./comment-button"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { getMealTypeLabel } from "@/lib/utils"
import type { Meal } from "@/lib/types"
import { useEffect, useState, useRef } from "react"
import PhotoViewer from "./photo-viewer"
import NoteButton from "./note-button"

interface MealCardProps {
  meal: Meal
  onDelete?: (meal: Meal) => void
  onEdit?: (meal: Meal) => void
  showDeleteButton?: boolean
  showEditButton?: boolean
  isPdfMode?: boolean
  isSharedView?: boolean
}

export default function MealCard({
  meal,
  onDelete,
  onEdit,
  showDeleteButton = true,
  showEditButton = true,
  isPdfMode = false,
  isSharedView = false,
}: MealCardProps) {
  let formattedDate = ""
  let formattedTime = ""
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null)
  const [comment, setComment] = useState<string | undefined>(undefined);

  // Always format date and time for every card
  if (meal.created_at) {
    try {
      const date = parseISO(meal.created_at)
      formattedDate = format(date, "d MMM yyyy", { locale: es })
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

  return (
    <>
      <Card
        className={`overflow-hidden bg-white border border-gray-200 hover:border-teal-300 hover:shadow-md transition-all duration-200 ${isPdfMode ? "pdf-meal-card" : ""}`}
      >
        {/* Photo Section o encabezado visual */}
        {meal.photo_url && !imageError ? (
          <div className="relative overflow-hidden bg-gray-50 cursor-pointer aspect-square" onClick={handlePhotoClick}>
            <img
              ref={imageRef}
              src={meal.photo_url || "/placeholder.svg"}
              alt={meal.description}
              className={`w-full h-full object-cover transition-transform duration-200 ${isPdfMode ? "pdf-image" : "hover:scale-105"}`}
              onLoad={handleImageLoad}
              onError={handleImageError}
              crossOrigin="anonymous"
            />
            {/* Badge tipo de comida */}
            <div className="absolute top-2 left-2">
              <Badge className={`${getMealTypeColor(meal.meal_type)} font-medium text-xs px-2 py-1 border`}>
                {getMealTypeLabel(meal.meal_type)}
              </Badge>
            </div>
            {/* Hora */}
            {formattedTime && (
              <div className="absolute top-2 right-2">
                <Badge className="bg-white/90 text-gray-700 font-medium text-xs px-2 py-1 border border-gray-200">
                  <Clock className="w-3 h-3 mr-1" />
                  {formattedTime}
                </Badge>
              </div>
            )}
          </div>
        ) : (
          // Si no hay foto, igual mostrar badge y hora arriba y el texto "Sin foto"
          <div className="relative bg-gray-50 flex flex-col justify-between items-center h-16 md:h-20">
            <div className="flex justify-between w-full p-2">
              <Badge className={`${getMealTypeColor(meal.meal_type)} font-medium text-xs px-2 py-1 border`}>
                {getMealTypeLabel(meal.meal_type)}
              </Badge>
              {formattedTime && (
                <Badge className="bg-white/90 text-gray-700 font-medium text-xs px-2 py-1 border border-gray-200 ml-2">
                  <Clock className="w-3 h-3 mr-1" />
                  {formattedTime}
                </Badge>
              )}
            </div>
            <div className="flex-1 flex items-center justify-center w-full">
              <span className="text-teal-600 text-sm font-medium italic select-none">{getMealTypeLabel(meal.meal_type)}</span>
            </div>
          </div>
        )}

        {/* Content Section */}
        <CardContent className="p-3">
          <div className="space-y-2">
            <h3 className="font-semibold text-base text-gray-900 leading-tight line-clamp-2">{meal.description}</h3>

            {/* Date info - Always visible */}
            {formattedDate && (
              <div className="flex items-center text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                <Calendar className="w-3 h-3 mr-1 text-gray-500" />
                <span className="font-medium">{formattedDate}</span>
              </div>
            )}

            {/* Notes */}
            {meal.notes && (
              <div className="bg-teal-50 rounded p-2 border-l-2 border-teal-500">
                <p className="text-xs text-gray-700 leading-relaxed line-clamp-2">{meal.notes}</p>
              </div>
            )}
          </div>
        </CardContent>

        {/* Actions Footer */}
        {!isPdfMode && (showDeleteButton || showEditButton || true) && (onDelete || onEdit) && (
          <CardFooter className="px-3 py-2 bg-gray-50 border-t">
            <div className="flex justify-end space-x-1 w-full">
              {isSharedView && (
                <>
                  <CommentButton
                    onSave={setComment}
                    onDelete={() => setComment(undefined)}
                    comment={comment}
                  />
                  <NoteButton comment={comment} />
                </>
              )}
              {showEditButton && onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 h-7 px-2 text-xs font-medium"
                  onClick={handleEdit}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Editar
                </Button>
              )}

              {showDeleteButton && onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 px-2 text-xs font-medium"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
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
