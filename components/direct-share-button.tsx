"use client"

import { useState, useEffect } from "react"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"

interface DirectShareButtonProps {
  compact?: boolean
}

export default function DirectShareButton({ compact = false }: DirectShareButtonProps) {
  const [shareUrl, setShareUrl] = useState<string>("")
  const [copied, setCopied] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedCycle, setSelectedCycle] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const { user, ensureDbSetup } = useAuth()

  // Check if user exists when the component mounts or when the dialog opens
  useEffect(() => {
    if (isOpen && user) {
      handleShare()
    }
  }, [isOpen, user])

  const handleShare = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para compartir tu historial",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Ensure database is set up
      await ensureDbSetup()

      // Create share URL with the user ID
      const baseUrl = window.location.origin
      let shareUrl = `${baseUrl}/share/${user.id}`

      // Add cycle parameter if a specific cycle is selected
      if (selectedCycle !== "all") {
        shareUrl += `?cycle=${selectedCycle}`
      }

      setShareUrl(shareUrl)
      setCopied(false)
    } catch (error) {
      console.error("Error generating share URL:", error)
      setError("No se pudo generar el enlace para compartir")
      toast({
        title: "Error",
        description: "No se pudo generar el enlace para compartir",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = () => {
    if (!shareUrl) return

    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    toast({
      title: "Enlace copiado",
      description: "El enlace ha sido copiado al portapapeles",
    })

    // Reset copied state after 3 seconds
    setTimeout(() => {
      setCopied(false)
    }, 3000)
  }

  const openShareLink = () => {
    if (!shareUrl) return

    window.open(shareUrl, "_blank")
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size={compact ? "sm" : "default"} className="flex items-center">
          <Share className="h-4 w-4 mr-2" />
          {!compact && <span>Compartir</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Compartir historial</DialogTitle>
          <DialogDescription>Comparte tu historial de comidas con quien quieras mediante este enlace</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">¿Qué quieres compartir?</label>
            <Select
              value={selectedCycle}
              onValueChange={(value) => {
                setSelectedCycle(value)
                // Regenerate share URL when selection changes
                setTimeout(() => {
                  if (user) handleShare()
                }, 0)
              }}
            >
              <SelectTrigger className="w-full">
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

          {error && <div className="bg-red-50 p-3 rounded-md border border-red-200 text-red-700 text-sm">{error}</div>}

          <div className="space-y-2">
            <label className="text-sm font-medium">Enlace para compartir</label>
            <div className="flex items-center space-x-2">
              <Input value={shareUrl} readOnly className="font-mono text-sm flex-1" placeholder="Generando enlace..." />
              <Button size="icon" className="h-10 w-10" onClick={copyToClipboard} disabled={!shareUrl || isLoading}>
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
          <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>
            Cerrar
          </Button>
          <Button type="button" onClick={openShareLink} className="flex items-center" disabled={!shareUrl || isLoading}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Abrir enlace
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
