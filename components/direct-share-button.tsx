"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { Share2, Copy, ExternalLink } from "lucide-react"
import { generateShareableLink } from "@/lib/share-service"
import { shareContent } from "@/lib/utils"

export default function DirectShareButton() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState("")
  const [isSharing, setIsSharing] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()

  const handleOpenShareDialog = () => {
    if (!user) {
      toast({
        title: "Inicia sesión",
        description: "Debes iniciar sesión para compartir tu historial",
        variant: "destructive",
      })
      return
    }

    // Generate the direct share URL
    const url = generateShareableLink(user.id)
    setShareUrl(url)
    setDialogOpen(true)
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast({
        title: "Enlace copiado",
        description: "El enlace ha sido copiado al portapapeles",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo copiar el enlace",
        variant: "destructive",
      })
    }
  }

  const handleShareLink = async () => {
    setIsSharing(true)
    try {
      const result = await shareContent(
        "Mi historial de comidas en Mily",
        "Mira mi historial de comidas en Mily",
        shareUrl,
      )

      if (result.success) {
        toast({
          title: "Enlace compartido",
          description: "El enlace ha sido compartido exitosamente",
        })
      } else {
        // Fallback for browsers that don't support Web Share API
        await navigator.clipboard.writeText(shareUrl)
        toast({
          title: "Enlace copiado",
          description: "El enlace ha sido copiado al portapapeles",
        })
      }
    } catch (error) {
      console.error("Error sharing link:", error)
      toast({
        title: "Error",
        description: "No se pudo compartir el enlace",
        variant: "destructive",
      })
    } finally {
      setIsSharing(false)
    }
  }

  const handleOpenLink = () => {
    window.open(shareUrl, "_blank")
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpenShareDialog} className="flex items-center gap-2">
        <Share2 className="h-4 w-4" />
        Compartir historial
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Compartir historial</DialogTitle>
            <DialogDescription>
              Comparte tu historial de comidas con cualquier persona usando este enlace
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 mt-4">
            <Input
              value={shareUrl}
              readOnly
              className="flex-1"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <Button variant="outline" size="icon" onClick={handleCopyLink} title="Copiar enlace">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex justify-between mt-4">
            <Button variant="outline" onClick={handleOpenLink}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir enlace
            </Button>
            <Button onClick={handleShareLink} disabled={isSharing}>
              <Share2 className="h-4 w-4 mr-2" />
              {isSharing ? "Compartiendo..." : "Compartir"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
