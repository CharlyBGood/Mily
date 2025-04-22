"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Share2, FileDown, Link2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { shareContent } from "@/lib/utils"
import type { Meal } from "@/lib/local-storage"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { getMealTypeLabel } from "@/lib/utils"
import { groupMealsByDay } from "@/lib/utils"
import { jsPDF } from "jspdf"

interface ShareDropdownProps {
  meals: Meal[]
  onBeforePdfExport?: () => Promise<HTMLElement | null>
  onAfterPdfExport?: () => void
  disabled?: boolean
}

export default function ShareDropdown({
  meals,
  onBeforePdfExport,
  onAfterPdfExport,
  disabled = false,
}: ShareDropdownProps) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const { toast } = useToast()

  const handleShareLink = async () => {
    if (disabled || isSharing) return

    setIsSharing(true)
    const shareUrl = `${window.location.origin}/share`

    try {
      const result = await shareContent(
        "Mi registro de comidas en Mily",
        "Mira mi registro de comidas en Mily",
        shareUrl,
      )

      if (result.success) {
        toast({
          title: "Enlace compartido",
          description: "El enlace ha sido compartido exitosamente",
        })
      } else {
        // Fallback for browsers that don't support Web Share API
        navigator.clipboard.writeText(shareUrl)
        toast({
          title: "Enlace copiado",
          description: "El enlace ha sido copiado al portapapeles",
        })
      }
    } catch (error) {
      console.error("Error sharing link:", error)

      // Fallback to clipboard
      try {
        navigator.clipboard.writeText(shareUrl)
        toast({
          title: "Enlace copiado",
          description: "El enlace ha sido copiado al portapapeles",
        })
      } catch (clipboardError) {
        toast({
          title: "Error",
          description: "No se pudo compartir el enlace",
          variant: "destructive",
        })
      }
    } finally {
      setIsSharing(false)
    }
  }

  // Helper function to load an image and get its dimensions
  const loadImage = async (
    src: string,
  ): Promise<{
    img: HTMLImageElement
    dataUrl: string
    width: number
    height: number
    aspectRatio: number
  }> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = "anonymous"

      img.onload = () => {
        if (img.complete && img.naturalWidth > 0) {
          try {
            // Create a canvas to prepare the image
            const canvas = document.createElement("canvas")
            canvas.width = img.naturalWidth
            canvas.height = img.naturalHeight

            const ctx = canvas.getContext("2d")
            if (!ctx) {
              reject(new Error("Failed to get canvas context"))
              return
            }

            // Draw white background first (for transparent images)
            ctx.fillStyle = "#FFFFFF"
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            // Draw the image at original size
            ctx.drawImage(img, 0, 0)

            // Get data URL (75% quality JPEG for file size optimization)
            const dataUrl = canvas.toDataURL("image/jpeg", 0.75)

            resolve({
              img,
              dataUrl,
              width: img.naturalWidth,
              height: img.naturalHeight,
              aspectRatio: img.naturalWidth / img.naturalHeight,
            })
          } catch (error) {
            console.error("Error preparing image:", error)
            // If preparation fails, still return the original image
            resolve({
              img,
              dataUrl: src,
              width: img.naturalWidth,
              height: img.naturalHeight,
              aspectRatio: img.naturalWidth / img.naturalHeight,
            })
          }
        } else {
          reject(new Error("Image failed to load properly"))
        }
      }

      img.onerror = () => {
        console.error("Error loading image:", src)
        reject(new Error("Image failed to load"))
      }

      img.src = src

      // Set a timeout in case the image takes too long to load
      setTimeout(() => {
        if (!img.complete) {
          reject(new Error("Image load timeout"))
        }
      }, 5000)
    })
  }

  // Helper function to truncate text with ellipsis
  const truncateText = (text: string, maxLines: number, fontSize: number, maxWidth: number): string[] => {
    // Estimate characters per line (rough approximation)
    const avgCharWidth = fontSize * 0.6 // Approximate width of a character
    const charsPerLine = Math.floor(maxWidth / avgCharWidth)

    // Split text into words
    const words = text.split(" ")
    const lines: string[] = []
    let currentLine = ""

    // Build lines word by word
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word

      if (testLine.length <= charsPerLine) {
        currentLine = testLine
      } else {
        lines.push(currentLine)
        currentLine = word

        // Check if we've reached the maximum number of lines
        if (lines.length >= maxLines) {
          break
        }
      }
    }

    // Add the last line if there's room
    if (currentLine && lines.length < maxLines) {
      lines.push(currentLine)
    }

    // Add ellipsis to the last line if we truncated the text
    if (lines.length === maxLines && (currentLine || words.length > lines.join(" ").split(" ").length)) {
      lines[maxLines - 1] = lines[maxLines - 1].trim() + "..."
    }

    return lines
  }

  const handleExportPDF = async () => {
    if (disabled || meals.length === 0 || isGeneratingPdf) return

    setIsGeneratingPdf(true)
    toast({
      title: "Generando PDF",
      description: "Preparando tu historial de comidas...",
    })

    try {
      console.log("Starting PDF export process")

      // Group meals by day
      const groupedMeals = groupMealsByDay(meals)

      // Generate filename with current date
      const currentDate = format(new Date(), "yyyy-MM-dd", { locale: es })
      const filename = `Mily_Historial_${currentDate}.pdf`

      // Create a new PDF document (A4 size)
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      })

      // Add custom font
      pdf.setFont("helvetica")

      // Set page margins as per requirements
      const marginSide = 10 // 10mm side margins
      const marginTopBottom = 15 // 15mm top/bottom margins
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const contentWidth = pageWidth - 2 * marginSide

      // Determine if we're on a mobile device (screen width < 500px)
      const isMobileView = window.innerWidth < 500

      // Calculate column layout - use 2 columns on desktop for more compact layout
      const columns = isMobileView ? 1 : 2
      const columnWidth = (contentWidth - (columns - 1) * 5) / columns // 5mm gap between columns
      const columnGap = 5 // 5mm gap between columns

      // Load the Mily logo image
      const logoImg = new Image()
      logoImg.crossOrigin = "anonymous"

      // Wait for the logo to load
      await new Promise((resolve, reject) => {
        logoImg.onload = resolve
        logoImg.onerror = reject
        logoImg.src =
          "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/MilyOnShadows11Times-6P2DpEvL4dZghlT39MCVQf6DtUci6e.png"
      })

      // Create a canvas to prepare the logo
      const canvas = document.createElement("canvas")
      canvas.width = logoImg.width
      canvas.height = logoImg.height
      const ctx = canvas.getContext("2d")

      if (ctx) {
        // Draw the logo on canvas
        ctx.drawImage(logoImg, 0, 0)

        // Get logo as data URL
        const logoDataUrl = canvas.toDataURL("image/png")

        // Add logo to the PDF
        const logoHeight = 10 // Height in mm
        const logoWidth = (logoImg.width / logoImg.height) * logoHeight
        pdf.addImage(logoDataUrl, "PNG", marginSide, marginTopBottom, logoWidth, logoHeight)
      }

      // Add title to the right of the logo
      pdf.setFontSize(20)
      pdf.setTextColor(18, 102, 76) // #12664c
      pdf.text("Historial de Comidas", marginSide + 40, marginTopBottom + 7)

      // Add date
      pdf.setFontSize(10)
      pdf.setTextColor(100, 100, 100)
      const dateText = format(new Date(), "d 'de' MMMM, yyyy", { locale: es })
      pdf.text(dateText, pageWidth - marginSide, marginTopBottom + 7, { align: "right" })

      // Start content further down to avoid overlap with header
      let yPosition = marginTopBottom + 20
      let currentPage = 1

      // Process each day group
      for (let i = 0; i < groupedMeals.length; i++) {
        const group = groupedMeals[i]
        console.log(`Processing day group ${i + 1}/${groupedMeals.length}: ${group.displayDate}`)

        // We'll need to preprocess all meals in this group to calculate their heights
        const mealCards = []

        // Preprocess all meals to determine their dimensions
        for (let j = 0; j < group.meals.length; j++) {
          const meal = group.meals[j]
          const cardPadding = 3 // Reduced padding for more compact cards
          const cardContentWidth = columnWidth - 2 * cardPadding

          // Base height for text content (reduced for more compact cards)
          let cardHeight = 20

          // Process image if available
          let imageHeight = 0
          let imageWidth = 0
          let imageDataUrl = null
          let originalAspectRatio = 1

          if (meal.photo_url) {
            try {
              // Load image and get dimensions
              const { dataUrl, width, height, aspectRatio } = await loadImage(meal.photo_url)
              imageDataUrl = dataUrl
              originalAspectRatio = aspectRatio

              // Define reasonable limits (reduced for more compact cards)
              const minImageHeight = 20 // Minimum height in mm
              const maxImageHeight = 60 // Maximum height in mm (reduced for more compact cards)

              // Calculate dimensions based on original aspect ratio
              imageWidth = cardContentWidth
              imageHeight = imageWidth / originalAspectRatio

              // Apply constraints based on aspect ratio
              if (originalAspectRatio > 2) {
                // Very wide image - constrain height more
                imageHeight = Math.max(minImageHeight, Math.min(imageHeight, 30))
              } else if (originalAspectRatio < 0.5) {
                // Very tall image - constrain height but allow more space
                imageHeight = Math.max(minImageHeight, Math.min(imageHeight, maxImageHeight))
              } else {
                // More balanced image - allow more of original dimensions
                imageHeight = Math.max(minImageHeight, Math.min(imageHeight, 40))
              }

              // Recalculate width to maintain aspect ratio
              imageWidth = imageHeight * originalAspectRatio

              // If width exceeds content width, scale down proportionally
              if (imageWidth > cardContentWidth) {
                const scale = cardContentWidth / imageWidth
                imageWidth = cardContentWidth
                imageHeight = imageHeight * scale
              }

              // Add image height to card height
              cardHeight += imageHeight + 3 // Reduced spacing after image
            } catch (error) {
              console.error("Error processing image:", error)
              // Continue without the image
            }
          }

          // Truncate and measure description text
          const descriptionFontSize = 10 // Reduced font size
          const descriptionMaxLines = 2
          const descriptionLines = truncateText(
            meal.description,
            descriptionMaxLines,
            descriptionFontSize,
            cardContentWidth,
          )

          // Add height for description
          cardHeight += descriptionLines.length * 4 // Reduced line height

          // Truncate and measure notes text if available
          let notesLines: string[] = []
          if (meal.notes) {
            const notesFontSize = 8 // Reduced font size
            const notesMaxLines = 2 // Reduced max lines
            notesLines = truncateText(meal.notes, notesMaxLines, notesFontSize, cardContentWidth)

            // Add height for notes
            cardHeight += notesLines.length * 3 // Reduced line height
          }

          // Store all the calculated information for this meal card
          mealCards.push({
            meal,
            cardHeight,
            imageDataUrl,
            imageWidth,
            imageHeight,
            originalAspectRatio,
            descriptionLines,
            notesLines,
          })
        }

        // Calculate total height needed for this day's meals
        // We need to account for the multi-column layout
        let totalDayHeight = 10 // Start with header height (reduced)

        // Calculate how many rows we'll need based on the number of columns
        const mealsPerRow = columns
        const numRows = Math.ceil(mealCards.length / mealsPerRow)

        // For each row, find the tallest card to determine row height
        for (let row = 0; row < numRows; row++) {
          const startIdx = row * mealsPerRow
          const endIdx = Math.min(startIdx + mealsPerRow, mealCards.length)
          const rowCards = mealCards.slice(startIdx, endIdx)

          // Find the tallest card in this row
          const maxRowCardHeight = Math.max(...rowCards.map((card) => card.cardHeight))

          // Add row height plus spacing
          totalDayHeight += maxRowCardHeight + 5 // Reduced spacing between rows
        }

        // Check if we need a new page for this day group
        if (yPosition + totalDayHeight > pageHeight - marginTopBottom) {
          pdf.addPage()
          currentPage++
          yPosition = marginTopBottom
        }

        // Add day header
        pdf.setFillColor(230, 255, 250) // Light teal background
        pdf.setDrawColor(18, 102, 76) // #12664c
        pdf.roundedRect(marginSide, yPosition, contentWidth, 8, 2, 2, "F") // Reduced height

        pdf.setFont("helvetica", "bold")
        pdf.setFontSize(10) // Reduced font size
        pdf.setTextColor(18, 102, 76) // #12664c
        pdf.text(group.displayDate, marginSide + 5, yPosition + 5) // Adjusted position

        yPosition += 12 // Reduced spacing after header

        // Variables for multi-column layout
        let currentColumn = 0
        let rowStartY = yPosition
        let maxRowHeight = 0

        // Now render each meal card using our preprocessed information
        for (let j = 0; j < mealCards.length; j++) {
          const cardInfo = mealCards[j]
          const meal = cardInfo.meal

          // Calculate x position based on current column
          const xPosition = marginSide + currentColumn * (columnWidth + columnGap)

          // Reset y position to the start of the current row
          const mealYPosition = rowStartY

          // Get card dimensions from our preprocessed data
          const cardPadding = 3 // Reduced padding
          const cardHeight = cardInfo.cardHeight

          // Draw meal card background
          pdf.setFillColor(255, 255, 255)
          pdf.setDrawColor(230, 230, 230)
          pdf.roundedRect(xPosition, mealYPosition, columnWidth, cardHeight, 2, 2, "FD") // Reduced border radius

          // Current vertical position within the card
          let contentYPosition = mealYPosition + cardPadding

          // Add meal type badge and date/time
          const mealTypeLabel = getMealTypeLabel(meal.meal_type)
          pdf.setFont("helvetica", "bold")
          pdf.setFontSize(8) // Reduced font size
          pdf.setTextColor(18, 102, 76) // #12664c

          // Measure text width for the badge
          const mealTypeLabelWidth = pdf.getTextWidth(mealTypeLabel) + 6 // Reduced padding

          // Draw badge background
          pdf.setFillColor(230, 255, 250) // Light teal background
          pdf.roundedRect(xPosition + cardPadding, contentYPosition, mealTypeLabelWidth, 4, 1, 1, "F") // Reduced size

          // Add meal type text
          pdf.text(mealTypeLabel, xPosition + cardPadding + 3, contentYPosition + 3) // Adjusted position

          // Add time if available
          if (meal.created_at) {
            pdf.setFont("helvetica", "normal")
            pdf.setFontSize(7) // Reduced font size
            pdf.setTextColor(100, 100, 100)

            // Format time only for more compact display
            const mealDate = new Date(meal.created_at)
            const timeText = format(mealDate, "HH:mm", { locale: es })

            pdf.text(timeText, xPosition + columnWidth - cardPadding, contentYPosition + 3, { align: "right" })
          }

          // Move down after the badge and date
          contentYPosition += 7 // Reduced spacing

          // Add meal description
          pdf.setFont("helvetica", "bold")
          pdf.setFontSize(10) // Reduced font size
          pdf.setTextColor(0, 0, 0)

          // Add each line of the description
          cardInfo.descriptionLines.forEach((line, lineIndex) => {
            pdf.text(line, xPosition + cardPadding, contentYPosition + lineIndex * 4) // Reduced line height
          })

          // Move down after description
          contentYPosition += cardInfo.descriptionLines.length * 4 + 1 // Reduced spacing

          // Add meal notes if available
          if (meal.notes && cardInfo.notesLines.length > 0) {
            pdf.setFont("helvetica", "normal")
            pdf.setFontSize(8) // Reduced font size
            pdf.setTextColor(100, 100, 100)

            // Add each line of the notes
            cardInfo.notesLines.forEach((line, lineIndex) => {
              pdf.text(line, xPosition + cardPadding, contentYPosition + lineIndex * 3) // Reduced line height
            })

            // Move down after notes
            contentYPosition += cardInfo.notesLines.length * 3 + 2 // Reduced spacing
          } else {
            // Add some spacing if no notes
            contentYPosition += 2 // Reduced spacing
          }

          // Add image if available - positioned after text content
          if (cardInfo.imageDataUrl && cardInfo.imageWidth > 0 && cardInfo.imageHeight > 0) {
            // Center the image horizontally within the column
            const imgXPosition = xPosition + (columnWidth - cardInfo.imageWidth) / 2

            // Add image to PDF with original proportions
            pdf.addImage(
              cardInfo.imageDataUrl,
              "JPEG",
              imgXPosition,
              contentYPosition,
              cardInfo.imageWidth,
              cardInfo.imageHeight,
              undefined,
              "FAST",
            )
          }

          // Update the maximum row height if this meal card is taller
          maxRowHeight = Math.max(maxRowHeight, cardHeight + 5) // Reduced spacing between rows

          // Move to the next column
          currentColumn++

          // If we've filled all columns in this row, or this is the last meal,
          // move to the next row
          if (currentColumn >= columns || j === mealCards.length - 1) {
            // Move y position down by the maximum height in this row
            rowStartY += maxRowHeight
            yPosition = rowStartY

            // Reset for the next row
            currentColumn = 0
            maxRowHeight = 0
          }
        }

        // Add spacing between day groups
        yPosition += 8 // Reduced spacing between day groups
      }

      // Add page numbers and footer to all pages
      for (let i = 1; i <= currentPage; i++) {
        pdf.setPage(i)

        // Add page number
        pdf.setFont("helvetica", "normal")
        pdf.setFontSize(8)
        pdf.setTextColor(150, 150, 150)
        pdf.text(`Página ${i} de ${currentPage}`, pageWidth - marginSide, pageHeight - marginTopBottom, {
          align: "right",
        })

        // Add footer
        pdf.text("Generado con Mily", pageWidth / 2, pageHeight - marginTopBottom, { align: "center" })
      }

      // Save the PDF
      pdf.save(filename)
      console.log("PDF saved successfully")

      // Call the callback after PDF export
      if (onAfterPdfExport) {
        onAfterPdfExport()
      }

      // Show success toast
      toast({
        title: "PDF generado",
        description: "El historial ha sido exportado exitosamente",
      })
    } catch (error) {
      console.error("Error in PDF export process:", error)
      toast({
        title: "Error",
        description: `Ocurrió un error al generar el PDF: ${error instanceof Error ? error.message : "Error desconocido"}`,
        variant: "destructive",
      })
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  const isButtonDisabled = disabled || meals.length === 0 || isGeneratingPdf || isSharing

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={isButtonDisabled}
            className={isGeneratingPdf || isSharing ? "opacity-70" : ""}
          >
            {isGeneratingPdf ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600 mr-2"></div>
                <span>Generando...</span>
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4 mr-2" />
                <span>Compartir</span>
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={handleExportPDF}
            disabled={meals.length === 0 || isGeneratingPdf}
            className="cursor-pointer"
          >
            <FileDown className="h-4 w-4 mr-2" />
            <span>Exportar como PDF</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleShareLink} disabled={isSharing} className="cursor-pointer">
            <Link2 className="h-4 w-4 mr-2" />
            <span>Compartir enlace</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
