"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Copy, Share2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { shareContent } from "@/lib/utils"

export default function DirectShareButton() {
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState("")
  const [isSharing, setIsSharing] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  const handleCreateShareLink = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para compartir tu historial",
        variant: "destructive",
      })
      return
    }

    // Generate the direct share URL using the user's ID with a cleaner format
    const url = `${window.location.origin}/share/${user.id}`
    setShareUrl(url)
    setShareDialogOpen(true)
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
    if (isSharing) return

    setIsSharing(true)
    try {
      const result = await shareContent(
        "Mi historial de comidas en NutriApp",
        "Mira mi historial de comidas en NutriApp",
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

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleCreateShareLink} className="flex items-center gap-2">
        <Share2 className="h-4 w-4" />
        Compartir historial
      </Button>

      {/* Share Link Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
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
            <Button onClick={handleCopyLink} variant="outline" size="icon">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={handleShareLink} disabled={isSharing}>
              {isSharing ? "Compartiendo..." : "Compartir"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
