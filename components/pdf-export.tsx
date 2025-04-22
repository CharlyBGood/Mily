"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FileDown } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { Meal } from "@/lib/local-storage"
import { groupMealsByDay, getMealTypeLabel } from "@/lib/utils"
import jsPDF from "jspdf"

interface PDFExportButtonProps {
  meals: Meal[]
  disabled?: boolean
}

export default function PDFExportButton({ meals, disabled = false }: PDFExportButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const { toast } = useToast()

  const handleExportPDF = async () => {
    if (disabled || meals.length === 0 || isGenerating) return

    setIsGenerating(true)
    toast({
      title: "Generando PDF",
      description: "Preparando tu historial de comidas...",
    })

    try {
      // Group meals by day
      const groupedMeals = groupMealsByDay(meals)

      // Generate filename with current date
      const currentDate = format(new Date(), "yyyy-MM-dd", { locale: es })
      const filename = `Mily_Historial_${currentDate}.pdf`

      // Create a new PDF document
      const pdf = new jsPDF("p", "mm", "a4")
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()

      // Add title to the PDF
      pdf.setFont("helvetica", "bold")
      pdf.setFontSize(18)
      pdf.setTextColor(15, 118, 110) // teal-600
      pdf.text("Historial de Comidas", 20, 20)

      // Add date to the PDF
      pdf.setFont("helvetica", "normal")
      pdf.setFontSize(10)
      pdf.setTextColor(100, 100, 100)
      pdf.text(format(new Date(), "d 'de' MMMM, yyyy", { locale: es }), pdfWidth - 60, 20)

      let yPosition = 30
      const pageMargin = 20
      const maxY = pdfHeight - pageMargin
      let pageCount = 1

      // Process each day group
      for (let i = 0; i < groupedMeals.length; i++) {
        const group = groupedMeals[i]

        // Check if we need a new page for this group
        if (yPosition > maxY - 30) {
          pdf.addPage()
          pageCount++
          yPosition = pageMargin
        }

        // Add day header
        pdf.setFont("helvetica", "bold")
        pdf.setFontSize(12)
        pdf.setTextColor(15, 118, 110) // teal-600
        pdf.setFillColor(230, 255, 250) // teal-50
        pdf.roundedRect(pageMargin, yPosition, pdfWidth - 2 * pageMargin, 10, 2, 2, "F")
        pdf.text(group.displayDate, pageMargin + 5, yPosition + 7)
        yPosition += 15

        // Process each meal in the group
        for (let j = 0; j < group.meals.length; j++) {
          const meal = group.meals[j]

          // Check if we need a new page for this meal
          if (yPosition > maxY - 50) {
            pdf.addPage()
            pageCount++
            yPosition = pageMargin
          }

          // Add meal card
          const cardWidth = pdfWidth - 2 * pageMargin
          const cardHeight = 40 // Base height for text content

          // Draw card background
          pdf.setFillColor(255, 255, 255)
          pdf.roundedRect(pageMargin, yPosition, cardWidth, cardHeight, 2, 2, "F")
          pdf.setDrawColor(230, 230, 230)
          pdf.roundedRect(pageMargin, yPosition, cardWidth, cardHeight, 2, 2, "S")

          // Add meal type
          pdf.setFont("helvetica", "bold")
          pdf.setFontSize(10)
          pdf.setTextColor(15, 118, 110) // teal-600
          pdf.setFillColor(230, 255, 250) // teal-50
          pdf.roundedRect(pageMargin + 5, yPosition + 5, 30, 6, 2, 2, "F")
          pdf.text(getMealTypeLabel(meal.meal_type), pageMargin + 7, yPosition + 9)

          // Add meal description
          pdf.setFont("helvetica", "bold")
          pdf.setFontSize(12)
          pdf.setTextColor(0, 0, 0)
          pdf.text(meal.description, pageMargin + 5, yPosition + 20)

          // Add meal notes if available
          if (meal.notes) {
            pdf.setFont("helvetica", "normal")
            pdf.setFontSize(10)
            pdf.setTextColor(100, 100, 100)
            pdf.text(meal.notes, pageMargin + 5, yPosition + 30, {
              maxWidth: cardWidth - 10,
            })
          }

          // Add meal time if available
          if (meal.created_at) {
            pdf.setFont("helvetica", "normal")
            pdf.setFontSize(8)
            pdf.setTextColor(150, 150, 150)
            const date = new Date(meal.created_at)
            pdf.text(format(date, "HH:mm", { locale: es }), pageMargin + cardWidth - 15, yPosition + 9)
          }

          yPosition += cardHeight + 5

          // Add meal photo if available
          if (meal.photo_url) {
            try {
              // Create an image element to load the photo
              const img = new Image()
              img.crossOrigin = "anonymous"

              // Wait for the image to load
              await new Promise((resolve, reject) => {
                img.onload = resolve
                img.onerror = () => {
                  console.error("Error loading image:", meal.photo_url)
                  resolve(null) // Continue without the image
                }
                img.src = meal.photo_url
              })

              // If image loaded successfully
              if (img.complete && img.naturalWidth > 0) {
                // Check if we need a new page for this photo
                if (yPosition + 80 > maxY) {
                  pdf.addPage()
                  pageCount++
                  yPosition = pageMargin
                }

                // Calculate dimensions for the photo (max height 80mm)
                const photoWidth = cardWidth - 10
                const aspectRatio = img.naturalWidth / img.naturalHeight
                const photoHeight = Math.min(80, photoWidth / aspectRatio)

                // Create a canvas to draw the image
                const canvas = document.createElement("canvas")
                canvas.width = img.naturalWidth
                canvas.height = img.naturalHeight
                const ctx = canvas.getContext("2d")

                if (ctx) {
                  // Draw white background first
                  ctx.fillStyle = "#FFFFFF"
                  ctx.fillRect(0, 0, canvas.width, canvas.height)
                  // Draw the image
                  ctx.drawImage(img, 0, 0)

                  try {
                    // Add the photo to the PDF
                    const photoData = canvas.toDataURL("image/jpeg", 0.85)
                    pdf.addImage(
                      photoData,
                      "JPEG",
                      pageMargin + 5,
                      yPosition,
                      photoWidth,
                      photoHeight,
                      undefined,
                      "FAST",
                    )
                    yPosition += photoHeight + 10
                  } catch (imgError) {
                    console.error("Error adding image to PDF:", imgError)
                    // Continue without the image
                  }
                }
              }
            } catch (error) {
              console.error("Error processing meal photo for PDF:", error)
              // Continue without the photo
            }
          }

          // Add spacing between meals
          yPosition += 10
        }

        // Add spacing between day groups
        yPosition += 10
      }

      // Add page numbers and footer to all pages
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i)

        // Add page number
        pdf.setFont("helvetica", "normal")
        pdf.setFontSize(8)
        pdf.setTextColor(150, 150, 150)
        pdf.text(`Página ${i} de ${pageCount}`, pdfWidth - 25, pdfHeight - 10)

        // Add footer
        pdf.text("Generado con Mily", pdfWidth / 2, pdfHeight - 10, { align: "center" })
      }

      // Save the PDF
      pdf.save(filename)

      // Show success toast
      toast({
        title: "PDF generado",
        description: "El historial ha sido exportado exitosamente",
      })
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al generar el PDF",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Determine button state and tooltip content
  const buttonDisabled = disabled || meals.length === 0 || isGenerating
  const tooltipContent =
    meals.length === 0
      ? "No hay comidas para exportar"
      : isGenerating
        ? "Generando PDF..."
        : "Exportar historial como PDF"

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              disabled={buttonDisabled}
              className={isGenerating ? "opacity-70 cursor-not-allowed" : ""}
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600 mr-2"></div>
                  <span>Generando...</span>
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4 mr-2" />
                  <span>Exportar PDF</span>
                </>
              )}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
