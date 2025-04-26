"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { FileDown } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { Meal } from "@/lib/local-storage"
import { groupMealsByDay } from "@/lib/utils"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"

interface PDFExportButtonProps {
  meals: Meal[]
  disabled?: boolean
}

export default function PDFExportButton({ meals, disabled = false }: PDFExportButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const { toast } = useToast()
  const pdfContentRef = useRef<HTMLDivElement>(null)

  const handleExportPDF = async () => {
    if (disabled || meals.length === 0 || isGenerating) return

    setIsGenerating(true)

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

      // Process each day group
      for (let i = 0; i < groupedMeals.length; i++) {
        const group = groupedMeals[i]

        // Check if we need a new page for this group
        if (yPosition > maxY - 30) {
          pdf.addPage()
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

          // Create a temporary div to render the meal card
          const tempDiv = document.createElement("div")
          tempDiv.style.position = "absolute"
          tempDiv.style.left = "-9999px"
          tempDiv.style.width = "400px" // Fixed width for consistent rendering
          document.body.appendChild(tempDiv)

          // Render the meal card to the temporary div
          const root = document.createElement("div")
          root.style.backgroundColor = "white"
          root.style.padding = "10px"
          root.style.borderRadius = "8px"
          root.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)"
          root.style.marginBottom = "10px"

          // Add meal type
          const typeDiv = document.createElement("div")
          typeDiv.style.display = "inline-block"
          typeDiv.style.backgroundColor = "#E6FFFA"
          typeDiv.style.color = "#0F766E"
          typeDiv.style.padding = "2px 8px"
          typeDiv.style.borderRadius = "4px"
          typeDiv.style.fontSize = "12px"
          typeDiv.style.marginBottom = "8px"
          typeDiv.textContent = getMealTypeLabel(meal.meal_type)
          root.appendChild(typeDiv)

          // Add meal description
          const titleDiv = document.createElement("div")
          titleDiv.style.fontSize = "16px"
          titleDiv.style.fontWeight = "bold"
          titleDiv.style.marginBottom = "4px"
          titleDiv.textContent = meal.description
          root.appendChild(titleDiv)

          // Add meal notes if available
          if (meal.notes) {
            const notesDiv = document.createElement("div")
            notesDiv.style.fontSize = "12px"
            notesDiv.style.color = "#666"
            notesDiv.textContent = meal.notes
            root.appendChild(notesDiv)
          }

          // Add meal time if available
          if (meal.created_at) {
            const timeDiv = document.createElement("div")
            timeDiv.style.fontSize = "10px"
            timeDiv.style.color = "#666"
            timeDiv.style.marginTop = "4px"
            const date = new Date(meal.created_at)
            timeDiv.textContent = format(date, "HH:mm", { locale: es })
            root.appendChild(timeDiv)
          }

          tempDiv.appendChild(root)

          // Capture the rendered meal card
          const canvas = await html2canvas(root, {
            scale: 2,
            logging: false,
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#FFFFFF",
          })

          // Calculate dimensions for the PDF
          const imgData = canvas.toDataURL("image/png")
          const imgWidth = pdfWidth - 2 * pageMargin
          const imgHeight = (canvas.height * imgWidth) / canvas.width

          // Check if we need a new page for this meal
          if (yPosition + imgHeight > maxY) {
            pdf.addPage()
            yPosition = pageMargin
          }

          // Add the meal card to the PDF
          pdf.addImage(imgData, "PNG", pageMargin, yPosition, imgWidth, imgHeight)
          yPosition += imgHeight + 10

          // Clean up
          document.body.removeChild(tempDiv)

          // Add meal photo if available
          if (meal.photo_url) {
            try {
              // Create an image element to load the photo
              const img = new Image()
              img.crossOrigin = "Anonymous"

              // Wait for the image to load
              await new Promise((resolve, reject) => {
                img.onload = resolve
                img.onerror = reject
                img.src = meal.photo_url || ""
              })

              // Calculate dimensions for the photo
              const photoWidth = imgWidth
              const photoHeight = (img.height * photoWidth) / img.width

              // Check if we need a new page for this photo
              if (yPosition + photoHeight > maxY) {
                pdf.addPage()
                yPosition = pageMargin
              }

              // Create a canvas to draw the image
              const photoCanvas = document.createElement("canvas")
              photoCanvas.width = img.width
              photoCanvas.height = img.height
              const ctx = photoCanvas.getContext("2d")

              if (ctx) {
                ctx.fillStyle = "#FFFFFF"
                ctx.fillRect(0, 0, photoCanvas.width, photoCanvas.height)
                ctx.drawImage(img, 0, 0)

                // Add the photo to the PDF
                const photoData = photoCanvas.toDataURL("image/jpeg", 0.7)
                pdf.addImage(photoData, "JPEG", pageMargin, yPosition, photoWidth, photoHeight)
                yPosition += photoHeight + 10
              }
            } catch (error) {
              console.error("Error adding meal photo to PDF:", error)
              // Continue without the photo
            }
          }

          // Add some spacing between meals
          yPosition += 5
        }

        // Add some spacing between day groups
        yPosition += 10
      }

      // Add footer
      pdf.setFont("helvetica", "normal")
      pdf.setFontSize(8)
      pdf.setTextColor(150, 150, 150)
      pdf.text("Generado con Mily", pdfWidth / 2, pdfHeight - 10, { align: "center" })

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

  // Helper function to get meal type label
  function getMealTypeLabel(type: string) {
    const types: Record<string, string> = {
      desayuno: "Desayuno",
      colacion1: "Colación",
      almuerzo: "Almuerzo",
      postre1: "Postre",
      merienda: "Merienda",
      colacion2: "Colación",
      cena: "Cena",
      postre2: "Postre",
    }
    return types[type] || type
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
    <>
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

      {/* Hidden div for PDF content rendering */}
      <div ref={pdfContentRef} className="hidden"></div>
    </>
  )
}
