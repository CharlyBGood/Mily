"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Heart, MessageCircle, MoreHorizontal, Flag, Trash2, Loader2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseClient } from "@/lib/supabase-client"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export interface PostProps {
  id: string
  content: string
  imageUrl?: string | null
  createdAt: string
  user: {
    id: string
    username?: string | null
    fullName?: string | null
    avatarUrl?: string | null
  }
  likeCount: number
  commentCount: number
  isLiked: boolean
  onCommentClick?: () => void
}

export default function Post({
  id,
  content,
  imageUrl,
  createdAt,
  user,
  likeCount,
  commentCount,
  isLiked,
  onCommentClick,
}: PostProps) {
  const [isLikedState, setIsLikedState] = useState(isLiked)
  const [likeCountState, setLikeCountState] = useState(likeCount)
  const [isLiking, setIsLiking] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [reportReason, setReportReason] = useState("")
  const [isReporting, setIsReporting] = useState(false)
  const { user: currentUser } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const handleLikeToggle = async () => {
    if (!currentUser) {
      router.push("/login")
      return
    }

    setIsLiking(true)
    try {
      const supabase = getSupabaseClient()

      if (isLikedState) {
        // Unlike
        const { error } = await supabase.from("likes").delete().eq("user_id", currentUser.id).eq("post_id", id)

        if (error) throw error

        setIsLikedState(false)
        setLikeCountState((prev) => Math.max(0, prev - 1))
      } else {
        // Like
        const { error } = await supabase.from("likes").insert({
          user_id: currentUser.id,
          post_id: id,
        })

        if (error) throw error

        setIsLikedState(true)
        setLikeCountState((prev) => prev + 1)
      }
    } catch (error) {
      console.error("Error toggling like:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el me gusta",
        variant: "destructive",
      })
    } finally {
      setIsLiking(false)
    }
  }

  const handleDeletePost = async () => {
    if (!currentUser || currentUser.id !== user.id) return

    setIsDeleting(true)
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from("posts").delete().eq("id", id)

      if (error) throw error

      toast({
        title: "Publicación eliminada",
        description: "Tu publicación ha sido eliminada exitosamente",
      })

      // Refresh the page or update the post list
      router.refresh()
    } catch (error) {
      console.error("Error deleting post:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar la publicación",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const handleReportSubmit = async () => {
    if (!currentUser) {
      router.push("/login")
      return
    }

    if (!reportReason.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa un motivo para el reporte",
        variant: "destructive",
      })
      return
    }

    setIsReporting(true)
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from("reports").insert({
        reporter_id: currentUser.id,
        post_id: id,
        reason: reportReason,
      })

      if (error) throw error

      toast({
        title: "Reporte enviado",
        description: "Gracias por ayudarnos a mantener la comunidad segura",
      })
      setShowReportDialog(false)
      setReportReason("")
    } catch (error) {
      console.error("Error reporting post:", error)
      toast({
        title: "Error",
        description: "No se pudo enviar el reporte",
        variant: "destructive",
      })
    } finally {
      setIsReporting(false)
    }
  }

  const isOwnPost = currentUser && user.id === currentUser.id
  const formattedDate = formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: es })

  return (
    <Card className="mb-4">
      <CardContent className="pt-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center">
            <Avatar
              className="h-10 w-10 mr-3 cursor-pointer"
              onClick={() => router.push(`/profile/${user.username || user.id}`)}
            >
              <AvatarImage src={user.avatarUrl || ""} alt={user.username || "Usuario"} />
              <AvatarFallback>{(user.username?.[0] || user.fullName?.[0] || "U").toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <div
                className="font-medium cursor-pointer hover:underline"
                onClick={() => router.push(`/profile/${user.username || user.id}`)}
              >
                {user.fullName || user.username || "Usuario"}
              </div>
              <div className="text-xs text-neutral-500">{formattedDate}</div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isOwnPost ? (
                <DropdownMenuItem className="text-red-600 cursor-pointer" onClick={() => setShowDeleteDialog(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem className="text-amber-600 cursor-pointer" onClick={() => setShowReportDialog(true)}>
                  <Flag className="h-4 w-4 mr-2" />
                  Reportar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mb-3">{content}</div>

        {imageUrl && (
          <div className="mb-3 rounded-md overflow-hidden">
            <img
              src={imageUrl || "/placeholder.svg"}
              alt="Imagen de la publicación"
              className="w-full h-auto object-cover"
            />
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0 pb-3 px-4 flex justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className={`flex items-center space-x-1 ${isLikedState ? "text-red-500" : ""}`}
            onClick={handleLikeToggle}
            disabled={isLiking}
          >
            {isLiking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Heart className={`h-4 w-4 ${isLikedState ? "fill-red-500" : ""}`} />
            )}
            <span>{likeCountState}</span>
          </Button>

          <Button variant="ghost" size="sm" className="flex items-center space-x-1" onClick={onCommentClick}>
            <MessageCircle className="h-4 w-4" />
            <span>{commentCount}</span>
          </Button>
        </div>
      </CardFooter>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente tu publicación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePost} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report Dialog */}
      <AlertDialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reportar publicación</AlertDialogTitle>
            <AlertDialogDescription>
              Por favor, indícanos por qué estás reportando esta publicación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="Motivo del reporte..."
            className="min-h-[100px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isReporting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReportSubmit}
              disabled={isReporting || !reportReason.trim()}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isReporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Enviando...
                </>
              ) : (
                "Enviar reporte"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
