"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Share, Copy, Check, ExternalLink, Globe, Lock } from "lucide-react"
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
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface DirectShareButtonProps {
  compact?: boolean
  onModalOpen?: () => void
}

export default function DirectShareButton({ compact = false, onModalOpen }: DirectShareButtonProps) {
  const [shareUrl, setShareUrl] = useState<string>("")
  const [copied, setCopied] = useState(false)
  const [selectedCycle, setSelectedCycle] = useState<string>("all")
  const [isOpen, setIsOpen] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  useEffect(() => {
    if (isOpen && user) {
      generateShareUrl()
    }
  }, [isOpen, user, selectedCycle])

  const generateShareUrl = () => {
    if (!user) return

    try {
      const baseUrl = window.location.origin
      let url = `${baseUrl}/share/${user.id}`

      if (selectedCycle !== "all") {
        url += `?cycle=${selectedCycle}`
      }

      setShareUrl(url)
    } catch (error) {
      console.error("Error generating share URL:", error)
      toast({
        title: "Error",
        description: "No se pudo generar el enlace para compartir",
        variant: "destructive",
      })
    }
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open && onModalOpen) {
      // Notify parent component that modal is opening
      onModalOpen()
    }
    if (!open) {
      setCopied(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast({
        title: "¡Enlace copiado!",
        description: "El enlace ha sido copiado al portapapeles",
      })

      setTimeout(() => {
        setCopied(false)
      }, 3000)
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo copiar el enlace",
        variant: "destructive",
      })
    }
  }

  const openShareLink = () => {
    if (shareUrl) {
      window.open(shareUrl, "_blank")
    }
  }

  const handleTriggerClick = (e: React.MouseEvent) => {
    // Prevent event propagation to parent elements
    e.preventDefault()
    e.stopPropagation()

    if (!user) {
      toast({
        title: "Inicia sesión",
        description: "Debes iniciar sesión para compartir tu historial",
        variant: "destructive",
      })
      return
    }

    // Small delay to ensure dropdown state is handled first
    setTimeout(() => {
      setIsOpen(true)
    }, 50)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? "sm" : "default"}
          onClick={handleTriggerClick}
          className="w-full justify-start hover:bg-gray-50"
        >
          <Share className="h-4 w-4 mr-2" />
          <span>Compartir enlace</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center text-xl">
            <Globe className="h-5 w-5 mr-2 text-teal-600" />
            Compartir historial
          </DialogTitle>
          <DialogDescription className="text-base">
            Comparte tu historial de comidas con quien quieras mediante este enlace público
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Privacy Notice */}
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <Lock className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-800">Enlace público</p>
                  <p className="text-sm text-amber-700">
                    Cualquier persona con este enlace podrá ver tu historial seleccionado
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cycle Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">¿Qué quieres compartir?</label>
            <Select value={selectedCycle} onValueChange={setSelectedCycle}>
              <SelectTrigger className="w-full h-11">
                <SelectValue placeholder="Selecciona qué compartir" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center space-x-2">
                    <span>📊</span>
                    <span>Todo el historial</span>
                  </div>
                </SelectItem>
                <SelectItem value="current">
                  <div className="flex items-center space-x-2">
                    <span>🔄</span>
                    <span>Ciclo actual</span>
                  </div>
                </SelectItem>
                <SelectItem value="1">
                  <div className="flex items-center space-x-2">
                    <span>1️⃣</span>
                    <span>Ciclo 1</span>
                  </div>
                </SelectItem>
                <SelectItem value="2">
                  <div className="flex items-center space-x-2">
                    <span>2️⃣</span>
                    <span>Ciclo 2</span>
                  </div>
                </SelectItem>
                <SelectItem value="3">
                  <div className="flex items-center space-x-2">
                    <span>3️⃣</span>
                    <span>Ciclo 3</span>
                  </div>
                </SelectItem>
                <SelectItem value="4">
                  <div className="flex items-center space-x-2">
                    <span>4️⃣</span>
                    <span>Ciclo 4</span>
                  </div>
                </SelectItem>
                <SelectItem value="5">
                  <div className="flex items-center space-x-2">
                    <span>5️⃣</span>
                    <span>Ciclo 5</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Share URL */}
          {shareUrl && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Enlace para compartir</label>
              <div className="flex items-center space-x-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="font-mono text-sm flex-1 bg-gray-50 border-gray-200"
                  onClick={(e) => e.target.select()}
                />
                <Button
                  size="icon"
                  className="h-11 w-11 flex-shrink-0"
                  onClick={copyToClipboard}
                  variant={copied ? "default" : "outline"}
                >
                  {copied ? <Check className="h-4 w-4 text-white" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              {copied && (
                <Badge variant="secondary" className="text-green-700 bg-green-100">
                  ✓ Copiado al portapapeles
                </Badge>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="w-full sm:w-auto">
            Cerrar
          </Button>
          <Button
            type="button"
            onClick={openShareLink}
            className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700"
            disabled={!shareUrl}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Abrir enlace
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
