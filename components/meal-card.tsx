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

  // Calculate optimal card width based on image dimensions and screen size
  const getCardStyle = () => {
    if (!imageLoaded || !imageDimensions.width || isPdfMode) {
      return {}
    }

    const screenWidth = typeof window !== "undefined" ? window.innerWidth : 400

    // For mobile: use full width minus padding
    if (screenWidth < 640) {
      return { width: "100%" }
    }

    // For tablet and desktop: use image width as base, with responsive constraints
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
        className={`group overflow-hidden bg-white border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 ${isPdfMode ? "pdf-meal-card" : ""}`}
        style={getCardStyle()}
      >
        {/* Photo Section */}
        {meal.photo_url && !imageError && (
          <div
            className="relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 cursor-pointer"
            onClick={handlePhotoClick}
          >
            <div className="w-full">
              <img
                ref={imageRef}
                src={meal.photo_url || "/placeholder.svg"}
                alt={meal.description}
                className={`w-full h-auto object-contain transition-all duration-500 ${
                  isPdfMode ? "pdf-image" : "group-hover:scale-[1.02]"
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

            {/* Enhanced gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Meal type badge */}
            <div className="absolute top-4 left-4">
              <Badge
                className={`${getMealTypeColor(meal.meal_type)} font-semibold text-sm px-3 py-1.5 shadow-lg backdrop-blur-sm`}
              >
                {getMealTypeLabel(meal.meal_type)}
              </Badge>
            </div>

            {/* Time badge */}
            {showTime && formattedTime && (
              <div className="absolute top-4 right-4">
                <Badge
                  variant="secondary"
                  className="bg-white/95 text-gray-700 font-semibold text-sm px-3 py-1.5 shadow-lg backdrop-blur-sm border border-white/30"
                >
                  <Clock className="w-4 h-4 mr-1.5" />
                  {formattedTime}
                </Badge>
              </div>
            )}

            {/* Hover indicator */}
            {!isPdfMode && (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="bg-white/95 rounded-full p-4 shadow-xl transform scale-90 group-hover:scale-100 transition-transform duration-200">
                  <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                    />
                  </svg>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Content Section */}
        <CardContent className="p-6 space-y-4">
          {/* Title and Date */}
          <div className="space-y-3">
            <h3 className="font-bold text-xl text-gray-900 leading-tight line-clamp-2">{meal.description}</h3>

            {/* Date info */}
            {showTime && formattedDate && (
              <div className="flex items-center text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                <Calendar className="w-5 h-5 mr-3 text-gray-400" />
                <span className="font-semibold">{formattedDate}</span>
              </div>
            )}
          </div>

          {/* Notes */}
          {meal.notes && (
            <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl p-4 border-l-4 border-teal-400">
              <p className="text-sm text-gray-700 leading-relaxed">{meal.notes}</p>
            </div>
          )}
        </CardContent>

        {/* Actions Footer */}
        {!isPdfMode && (showDeleteButton || showEditButton) && (onDelete || onEdit) && (
          <CardFooter className="px-6 py-4 bg-gray-50/80 border-t border-gray-100">
            <div className="flex justify-end space-x-3 w-full">
              {showEditButton && onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 h-10 px-5 rounded-xl font-semibold transition-all duration-200 flex items-center"
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
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 h-10 px-5 rounded-xl font-semibold transition-all duration-200 flex items-center"
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
