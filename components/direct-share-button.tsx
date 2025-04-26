"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Link2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

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

    setIsSharing(true)
    try {
      // Create a direct share URL using the user's ID
      const url = `${window.location.origin}/share/historialdemilydeuserconId=${user.id}`
      setShareUrl(url)
      setShareDialogOpen(true)
    } catch (error) {
      console.error("Error creating share link:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al crear el enlace para compartir",
        variant: "destructive",
      })
    } finally {
      setIsSharing(false)
    }
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

  return (
    <>
      <Button
        variant="ghost"
        className="w-full justify-start"
        onClick={handleCreateShareLink}
        disabled={isSharing || !user}
      >
        <Link2 className="h-4 w-4 mr-2" />
        <span>Crear enlace público</span>
      </Button>

      {/* Share Link Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Compartir historial</DialogTitle>
            <DialogDescription>
              Comparte tu historial de comidas con cualquier persona usando este enlace público
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 mt-4">
            <Input
              value={shareUrl}
              readOnly
              className="flex-1"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <Button onClick={handleCopyLink}>Copiar</Button>
          </div>
          <div className="flex justify-end mt-4">
            <Button
              onClick={() => {
                window.open(shareUrl, "_blank")
              }}
            >
              Abrir enlace
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
