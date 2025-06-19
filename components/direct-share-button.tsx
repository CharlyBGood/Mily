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
  const [selectedCycle, setSelectedCycle] = useState<string>("all")
  const { toast } = useToast()
  const { user } = useAuth()

  const handleShare = () => {
    if (!user) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para compartir tu historial",
        variant: "destructive",
      })
      return
    }

    try {
      const baseUrl = window.location.origin
      let shareUrl = `${baseUrl}/share/${user.id}`

      if (selectedCycle !== "all") {
        shareUrl += `?cycle=${selectedCycle}`
      }

      setShareUrl(shareUrl)
    } catch (error) {
      console.error("Error generating share URL:", error)
      toast({
        title: "Error",
        description: "No se pudo generar el enlace para compartir",
        variant: "destructive",
      })
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    toast({
      title: "Enlace copiado",
      description: "El enlace ha sido copiado al portapapeles",
    })

    setTimeout(() => {
      setCopied(false)
    }, 3000)
  }

  const openShareLink = () => {
    window.open(shareUrl, "_blank")
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? "sm" : "default"}
          onClick={handleShare}
          className="w-full justify-start"
        >
          <Share className="h-4 w-4 mr-2" />
          <span>Compartir enlace</span>
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
                setTimeout(handleShare, 0)
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

          <div className="space-y-2">
            <label className="text-sm font-medium">Enlace para compartir</label>
            <div className="flex items-center space-x-2">
              <Input value={shareUrl} readOnly className="font-mono text-sm flex-1" />
              <Button size="icon" className="h-10 w-10" onClick={copyToClipboard}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          <Button type="button" variant="secondary">
            Cerrar
          </Button>
          <Button type="button" onClick={openShareLink} className="flex items-center">
            <ExternalLink className="h-4 w-4 mr-2" />
            Abrir enlace
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
