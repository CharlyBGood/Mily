"use client"

import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2, Edit, Expand } from "lucide-react"
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
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 })
  const [showPhotoViewer, setShowPhotoViewer] = useState(false)
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

  const handleImageClick = () => {
    if (meal.photo_url && !isPdfMode) {
      setShowPhotoViewer(true)
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

  // Calculate card width based on image dimensions and screen size
  const getCardStyle = () => {
    if (!imageLoaded || !imageDimensions.width || isPdfMode) {
      return { maxWidth: "100%" }
    }

    const screenWidth = typeof window !== "undefined" ? window.innerWidth : 400
    const maxCardWidth = screenWidth < 640 ? screenWidth - 32 : 500 // 16px padding on each side for mobile
    const imageWidth = Math.min(imageDimensions.width, maxCardWidth)

    return {
      width: `${imageWidth}px`,
      maxWidth: "100%",
    }
  }

  return (
    <>
      <Card
        className={`overflow-hidden shadow-lg border-0 bg-white/80 backdrop-blur-sm mb-4 sm:mb-6 mx-auto transition-all duration-300 hover:shadow-xl hover:bg-white/90 ${isPdfMode ? "pdf-meal-card" : ""}`}
        style={getCardStyle()}
      >
        {meal.photo_url && !imageError && (
          <div ref={containerRef} className="relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 group">
            <img
              ref={imageRef}
              src={meal.photo_url || "/placeholder.svg"}
              alt={meal.description}
              className={`w-full h-auto object-contain cursor-pointer transition-all duration-300 ${
                isPdfMode ? "pdf-image" : "group-hover:scale-[1.02]"
              }`}
              style={{
                display: "block",
                maxWidth: "100%",
                height: "auto",
              }}
              onLoad={handleImageLoad}
              onError={handleImageError}
              onClick={handleImageClick}
              crossOrigin="anonymous"
            />
            {!isPdfMode && (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="bg-white/95 rounded-full p-3 shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-200">
                  <Expand className="h-5 w-5 text-gray-700" />
                </div>
              </div>
            )}
            {/* Subtle gradient overlay for better text readability */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
          </div>
        )}

        <CardContent className={`p-4 sm:p-6 ${isPdfMode ? "card-content" : ""}`}>
          <div className="space-y-3">
            <div className="flex flex-col space-y-2">
              <h3 className="font-semibold text-xl sm:text-2xl text-gray-900 leading-tight">{meal.description}</h3>
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-teal-100 text-teal-800 w-fit">
                {getMealTypeLabel(meal.meal_type)}
              </div>
            </div>

            {showTime && formattedDate && formattedTime && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                  <span className="font-medium">{formattedDate}</span>
                </div>
                <span>•</span>
                <span className="font-medium">{formattedTime}</span>
              </div>
            )}

            {meal.notes && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg border-l-4 border-teal-500">
                <p className="text-gray-700 text-sm sm:text-base leading-relaxed">{meal.notes}</p>
              </div>
            )}
          </div>
        </CardContent>

        {!isPdfMode && (showDeleteButton || showEditButton) && (onDelete || onEdit) && (
          <CardFooter className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50/80 border-t border-gray-100">
            <div className="flex justify-end space-x-2 w-full">
              {showEditButton && onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 h-9 px-4 rounded-lg font-medium transition-all duration-200"
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
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 h-9 px-4 rounded-lg font-medium transition-all duration-200"
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

      {/* Photo Viewer Modal */}
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
