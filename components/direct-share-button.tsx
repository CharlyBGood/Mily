"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Share, Copy, Check, ExternalLink } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"

interface DirectShareButtonProps {
  compact?: boolean
}

export default function DirectShareButton({ compact = false }: DirectShareButtonProps) {
  // State management
  const [isOpen, setIsOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState<string>("")
  const [copied, setCopied] = useState(false)
  const [selectedCycle, setSelectedCycle] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(false)

  const { toast } = useToast()
  const { user } = useAuth()

  // Function to handle button click - directly opens dialog and generates URL
  const handleButtonClick = () => {
    console.log("Share button clicked")
    setIsOpen(true)
    generateShareUrl()
  }

  // Function to generate share URL
  const generateShareUrl = () => {
    console.log("Generating share URL")
    setIsLoading(true)

    try {
      if (!user) {
        toast({
          title: "Error",
          description: "Debes iniciar sesión para compartir tu historial",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // Create share URL with the user ID
      const baseUrl = window.location.origin
      let url = `${baseUrl}/share/${user.id}`

      // Add cycle parameter if a specific cycle is selected
      if (selectedCycle !== "all") {
        url += `?cycle=${selectedCycle}`
      }

      console.log("Generated URL:", url)
      setShareUrl(url)
    } catch (error) {
      console.error("Error generating share URL:", error)
      toast({
        title: "Error",
        description: "No se pudo generar el enlace para compartir",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Function to handle cycle selection change
  const handleCycleChange = (value: string) => {
    console.log("Cycle selection changed to:", value)
    setSelectedCycle(value)
    generateShareUrl() // Regenerate URL when cycle changes
  }

  // Function to copy URL to clipboard
  const copyToClipboard = () => {
    console.log("Copying to clipboard:", shareUrl)
    if (!shareUrl) return

    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        setCopied(true)
        toast({
          title: "Enlace copiado",
          description: "El enlace ha sido copiado al portapapeles",
        })

        // Reset copied state after 3 seconds
        setTimeout(() => {
          setCopied(false)
        }, 3000)
      })
      .catch((err) => {
        console.error("Error copying to clipboard:", err)
        toast({
          title: "Error",
          description: "No se pudo copiar el enlace",
          variant: "destructive",
        })
      })
  }

  // Function to open share link in new tab
  const openShareLink = () => {
    console.log("Opening share link:", shareUrl)
    if (!shareUrl) return
    window.open(shareUrl, "_blank")
    setIsOpen(false)
  }

  // Function to close dialog
  const closeDialog = () => {
    console.log("Closing dialog")
    setIsOpen(false)
  }

  return (
    <>
      {/* Separate button from Dialog for more direct control */}
      <Button
        variant="default"
        size={compact ? "sm" : "default"}
        className="flex items-center"
        onClick={handleButtonClick}
        aria-label="Compartir historial"
      >
        <Share className="h-4 w-4 mr-2" />
        {!compact && <span>Compartir</span>}
      </Button>

      {/* Dialog as a separate component */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Compartir historial</DialogTitle>
            <DialogDescription>
              Comparte tu historial de comidas con quien quieras mediante este enlace
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="cycle-select" className="text-sm font-medium">
                ¿Qué quieres compartir?
              </label>
              <Select value={selectedCycle} onValueChange={handleCycleChange} disabled={isLoading}>
                <SelectTrigger id="cycle-select" className="w-full">
                  <SelectValue placeholder="Selecciona qué compartir" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo el historial</SelectItem>
                  <SelectItem value="current">Ciclo actual</SelectItem>
                  <SelectItem value="1">Ciclo 1</SelectItem>
                  <SelectItem value="2">Ciclo 2</SelectItem>
                  <SelectItem value="3">Ciclo 3</SelectItem>
                  <SelectItem value="4">Ciclo 4</SelectItem>
                  <SelectItem value="5">Ciclo 5</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="share-url" className="text-sm font-medium">
                Enlace para compartir
              </label>
              <div className="flex items-center space-x-2">
                <Input
                  id="share-url"
                  value={shareUrl}
                  readOnly
                  className="font-mono text-sm flex-1"
                  placeholder={isLoading ? "Generando enlace..." : "Enlace de compartir"}
                  aria-label="Enlace para compartir"
                />
                <Button
                  size="icon"
                  className="h-10 w-10"
                  onClick={copyToClipboard}
                  disabled={!shareUrl || isLoading}
                  aria-label="Copiar enlace"
                  title="Copiar enlace"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            <Button type="button" variant="secondary" onClick={closeDialog}>
              Cerrar
            </Button>
            <Button
              type="button"
              onClick={openShareLink}
              className="flex items-center"
              disabled={!shareUrl || isLoading}
              aria-label="Abrir enlace"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir enlace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
