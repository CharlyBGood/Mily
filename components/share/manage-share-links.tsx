"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Trash2, ExternalLink, Copy, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getUserShareLinks, deleteShareLink, generateShareableLink } from "@/lib/share-service"
import type { ShareLink } from "@/lib/share-service"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

export default function ManageShareLinks() {
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<number | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadShareLinks()
  }, [])

  const loadShareLinks = async () => {
    setLoading(true)
    try {
      const { success, data, error } = await getUserShareLinks()

      if (!success || error) {
        throw new Error(error?.message || "Error loading share links")
      }

      setShareLinks(data || [])
    } catch (error) {
      console.error("Error loading share links:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los enlaces compartidos",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteLink = async (shortId: string, index: number) => {
    setDeleting(index)
    try {
      const { success, error } = await deleteShareLink(shortId)

      if (!success || error) {
        throw new Error(error?.message || "Error deleting share link")
      }

      // Remove the link from the local state
      setShareLinks((prev) => prev.filter((link) => link.short_id !== shortId))

      toast({
        title: "Enlace eliminado",
        description: "El enlace compartido ha sido eliminado",
      })
    } catch (error) {
      console.error("Error deleting share link:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el enlace compartido",
        variant: "destructive",
      })
    } finally {
      setDeleting(null)
    }
  }

  const handleCopyLink = async (shortId: string) => {
    try {
      const url = generateShareableLink(shortId)
      await navigator.clipboard.writeText(url)
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

  const handleOpenLink = (shortId: string) => {
    const url = generateShareableLink(shortId)
    window.open(url, "_blank")
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    )
  }

  if (shareLinks.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-neutral-500 mb-4">No tienes enlaces compartidos</p>
        <Button onClick={loadShareLinks} variant="outline" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Tus enlaces compartidos</h2>
        <Button onClick={loadShareLinks} variant="outline" size="sm" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {shareLinks.map((link, index) => (
        <Card key={link.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Enlace compartido</CardTitle>
            <CardDescription>
              Creado {formatDistanceToNow(new Date(link.created_at), { addSuffix: true, locale: es })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyLink(link.short_id)}
                  className="flex items-center gap-1"
                >
                  <Copy className="h-3 w-3" />
                  Copiar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenLink(link.short_id)}
                  className="flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  Abrir
                </Button>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDeleteLink(link.short_id, index)}
                disabled={deleting === index}
                className="flex items-center gap-1"
              >
                {deleting === index ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
                Eliminar
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
