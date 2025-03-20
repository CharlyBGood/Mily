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
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageAttempted, setImageAttempted] = useState(false)
  const [proxyImageUrl, setProxyImageUrl] = useState<string | null>(null)

  // Fixed dimensions for consistent image size
  const CARD_WIDTH = 600
  const PHOTO_HEIGHT = 300

  // Handle image loading for Safari compatibility
  useEffect(() => {
    if (!meal.photo_url) {
      // No image to load, proceed immediately
      setImageLoaded(true)
      return
    }

    // For Safari/iOS compatibility, we need to handle the image differently
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

    if (isSafari || isIOS) {
      // For base64 images, convert to Blob URL for better Safari compatibility
      if (meal.photo_url.startsWith("data:")) {
        try {
          // Convert base64 to Blob URL
          const byteString = atob(meal.photo_url.split(",")[1])
          const mimeString = meal.photo_url.split(",")[0].split(":")[1].split(";")[0]
          const ab = new ArrayBuffer(byteString.length)
          const ia = new Uint8Array(ab)

          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i)
          }

          const blob = new Blob([ab], { type: mimeString })
          const blobUrl = URL.createObjectURL(blob)

          // Create a new image with the blob URL
          const img = new Image()
          img.crossOrigin = "anonymous"

          img.onload = () => {
            // Create a canvas to draw the image
            const canvas = document.createElement("canvas")
            // Set fixed dimensions for consistent sizing
            canvas.width = 1200 // Higher resolution for better quality
            canvas.height = 900

            const ctx = canvas.getContext("2d")
            if (!ctx) {
              setImageLoaded(true) // Continue anyway
              return
            }

            // Fill with white background (important for Safari)
            ctx.fillStyle = "#FFFFFF"
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            // Calculate dimensions to maintain aspect ratio
            const aspectRatio = img.width / img.height
            let drawWidth = canvas.width
            let drawHeight = drawWidth / aspectRatio

            if (drawHeight > canvas.height) {
              drawHeight = canvas.height
              drawWidth = drawHeight * aspectRatio
            }

            // Center the image
            const x = (canvas.width - drawWidth) / 2
            const y = (canvas.height - drawHeight) / 2

            // Draw the image
            ctx.drawImage(img, x, y, drawWidth, drawHeight)

            // Get the new data URL
            const newDataUrl = canvas.toDataURL("image/jpeg", 0.95)
            setProxyImageUrl(newDataUrl)
            setImageLoaded(true)

            // Clean up
            URL.revokeObjectURL(blobUrl)
          }

          img.onerror = () => {
            console.error("Error loading image from blob URL")
            setImageLoaded(true) // Continue anyway
            URL.revokeObjectURL(blobUrl)
          }

          img.src = blobUrl
        } catch (e) {
          console.error("Error converting base64 to Blob URL:", e)
          setImageLoaded(true) // Continue anyway
        }
      } else {
        // For regular URLs, use a similar approach with canvas
        const img = new Image()
        img.crossOrigin = "anonymous"

        img.onload = () => {
          // Create a canvas to draw the image
          const canvas = document.createElement("canvas")
          canvas.width = 1200
          canvas.height = 900

          const ctx = canvas.getContext("2d")
          if (!ctx) {
            setImageLoaded(true)
            return
          }

          // Fill with white background
          ctx.fillStyle = "#FFFFFF"
          ctx.fillRect(0, 0, canvas.width, canvas.height)

          // Calculate dimensions to maintain aspect ratio
          const aspectRatio = img.width / img.height
          let drawWidth = canvas.width
          let drawHeight = drawWidth / aspectRatio

          if (drawHeight > canvas.height) {
            drawHeight = canvas.height
            drawWidth = drawHeight * aspectRatio
          }

          // Center the image
          const x = (canvas.width - drawWidth) / 2
          const y = (canvas.height - drawHeight) / 2

          // Draw the image
          ctx.drawImage(img, x, y, drawWidth, drawHeight)

          // Get the new data URL
          const newDataUrl = canvas.toDataURL("image/jpeg", 0.95)
          setProxyImageUrl(newDataUrl)
          setImageLoaded(true)
        }

        img.onerror = () => {
          console.error("Error loading image from URL")
          setImageLoaded(true) // Continue anyway
        }

        img.src = meal.photo_url
      }
    } else {
      // For other browsers, standard approach
      const img = new Image()
      img.crossOrigin = "anonymous"

      img.onload = () => {
        setImageLoaded(true)
      }

      img.onerror = () => {
        console.error("Error loading image")
        setImageLoaded(true) // Continue anyway
      }

      img.src = meal.photo_url
    }

    setImageAttempted(true)

    // Fallback timeout for all browsers
    const timer = setTimeout(() => {
      if (!imageLoaded) {
        console.warn("Image load timeout - proceeding anyway")
        setImageLoaded(true)
      }
    }, 3000)

    return () => clearTimeout(timer)
  }, [meal.photo_url, imageLoaded])

  // Generate image when component mounts and image is loaded
  useEffect(() => {
    if (!cardRef.current || !imageLoaded || !imageAttempted) return

    const generateImage = async () => {
      try {
        // Wait a bit to ensure everything is rendered
        await new Promise((resolve) => setTimeout(resolve, 500))

        // Determine if we're on iOS/Safari
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

        const options = {
          quality: 1,
          pixelRatio: 2,
          cacheBust: true,
          // Fixed dimensions for consistent sizing
          width: CARD_WIDTH,
          height: cardRef.current.offsetHeight,
          // Safari-specific options
          skipAutoScale: true,
          canvasWidth: CARD_WIDTH * 2, // Higher resolution
          canvasHeight: cardRef.current.offsetHeight * 2,
          style: {
            // Ensure proper rendering in Safari
            transform: "none",
            "transform-origin": "center",
          },
          // Fallback image if loading fails
          imagePlaceholder:
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
        }

        // For iOS/Safari, use a different approach
        if (isSafari || isIOS) {
          // Use html2canvas as a fallback for Safari/iOS
          try {
            // Import html2canvas dynamically
            const html2canvas = (await import("html2canvas")).default

            const canvas = await html2canvas(cardRef.current, {
              useCORS: true,
              allowTaint: true,
              backgroundColor: "#FFFFFF",
              scale: 2,
              width: CARD_WIDTH,
              height: cardRef.current.offsetHeight,
              logging: false,
              onclone: (clonedDoc) => {
                // Find the image in the cloned document and ensure it's loaded
                const imgElement = clonedDoc.querySelector("img")
                if (imgElement && proxyImageUrl) {
                  imgElement.src = proxyImageUrl
                  imgElement.crossOrigin = "anonymous"
                  imgElement.style.objectFit = "contain"
                  imgElement.style.backgroundColor = "#FFFFFF"
                }
              },
            })

            const dataUrl = canvas.toDataURL("image/png")
            onImageGenerated(dataUrl)
          } catch (error) {
            console.error("html2canvas fallback failed:", error)

            // If html2canvas fails, try toPng as last resort
            const dataUrl = await toPng(cardRef.current, options)
            onImageGenerated(dataUrl)
          }
        } else {
          // For other browsers, use toPng
          const dataUrl = await toPng(cardRef.current, options)
          onImageGenerated(dataUrl)
        }
      } catch (error) {
        console.error("Error generating image:", error)
        onError(error instanceof Error ? error : new Error("Failed to generate image"))
      }
    }

    generateImage()
  }, [meal, imageLoaded, imageAttempted, onImageGenerated, onError, proxyImageUrl])

  const date = meal.created_at ? parseISO(meal.created_at) : new Date()
  const formattedDate = format(date, "EEEE, d 'de' MMMM", { locale: es })
  const formattedTime = format(date, "HH:mm")

  // Use the proxy image URL if available
  const imageUrl = proxyImageUrl || meal.photo_url

  return (
    <div className="fixed left-[-9999px] top-0 z-[-1]">
      <div ref={cardRef} className="bg-white" style={{ width: `${CARD_WIDTH}px` }}>
        <Card className="overflow-hidden border shadow-md">
          <CardHeader className="p-4 bg-teal-50 border-b">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-teal-800">NutriApp</h3>
              <div className="text-sm text-teal-600">
                {formattedDate} • {formattedTime}
              </div>
            </div>
          </CardHeader>

          {imageUrl && (
            <div className="w-full bg-white" style={{ height: `${PHOTO_HEIGHT}px` }}>
              <img
                src={imageUrl || "/placeholder.svg"}
                alt={meal.description}
                className="w-full h-full"
                crossOrigin="anonymous"
                style={{
                  objectFit: "contain",
                  display: "block",
                  width: "100%",
                  height: "100%",
                  backgroundColor: "white",
                }}
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

