"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, X } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseClient } from "@/lib/supabase-client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import Post, { type PostProps } from "./post"

interface Comment {
  id: string
  content: string
  createdAt: string
  user: {
    id: string
    username?: string | null
    fullName?: string | null
    avatarUrl?: string | null
  }
}

interface PostDetailProps {
  postId: string
  onClose: () => void
  onUpdate?: () => void
}

export default function PostDetail({ postId, onClose, onUpdate }: PostDetailProps) {
  const [post, setPost] = useState<PostProps | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    loadPostAndComments()
  }, [postId])

  const loadPostAndComments = async () => {
    setIsLoading(true)
    try {
      const supabase = getSupabaseClient()

      // Get post details
      const { data: postData, error: postError } = await supabase
        .from("posts")
        .select(`
          id,
          content,
          image_url,
          created_at,
          profiles!posts_user_id_fkey (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq("id", postId)
        .single()

      if (postError) throw postError

      // Get like count
      const { count: likeCount, error: likeError } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId)

      if (likeError) console.error("Error fetching like count:", likeError)

      // Get comment count
      const { count: commentCount, error: commentError } = await supabase
        .from("comments")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId)
        .not("is_archived", "eq", true)

      if (commentError) console.error("Error fetching comment count:", commentError)

      // Check if current user has liked the post
      let isLiked = false
      if (user) {
        const { data: likeData, error: userLikeError } = await supabase
          .from("likes")
          .select("id")
          .eq("post_id", postId)
          .eq("user_id", user.id)
          .maybeSingle()

        if (!userLikeError) {
          isLiked = !!likeData
        }
      }

      // Set post data
      setPost({
        id: postData.id,
        content: postData.content,
        imageUrl: postData.image_url,
        createdAt: postData.created_at,
        user: {
          id: postData.profiles.id,
          username: postData.profiles.username,
          fullName: postData.profiles.full_name,
          avatarUrl: postData.profiles.avatar_url,
        },
        likeCount: likeCount || 0,
        commentCount: commentCount || 0,
        isLiked,
      })

      // Get comments
      const { data: commentsData, error: commentsError } = await supabase
        .from("comments")
        .select(`
          id,
          content,
          created_at,
          profiles!comments_user_id_fkey (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq("post_id", postId)
        .not("is_archived", "eq", true)
        .order("created_at", { ascending: true })

      if (commentsError) throw commentsError

      // Format comments
      const formattedComments = commentsData.map((comment) => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.created_at,
        user: {
          id: comment.profiles.id,
          username: comment.profiles.username,
          fullName: comment.profiles.full_name,
          avatarUrl: comment.profiles.avatar_url,
        },
      }))

      setComments(formattedComments)
    } catch (error) {
      console.error("Error loading post details:", error)
      toast({
        title: "Error",
        description: "No se pudo cargar la publicación",
        variant: "destructive",
      })
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitComment = async () => {
    if (!user) {
      router.push("/login")
      return
    }

    if (!newComment.trim()) return

    setIsSubmitting(true)
    try {
      const supabase = getSupabaseClient()

      // Add comment
      const { error } = await supabase.from("comments").insert({
        post_id: postId,
        user_id: user.id,
        content: newComment.trim(),
      })

      if (error) throw error

      // Clear input
      setNewComment("")

      // Reload comments
      loadPostAndComments()

      // Update parent component if needed
      if (onUpdate) onUpdate()
    } catch (error) {
      console.error("Error adding comment:", error)
      toast({
        title: "Error",
        description: "No se pudo agregar el comentario",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex justify-between items-center">
            <span>Comentarios</span>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex-1 flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              {post && (
                <div className="p-4 border-b">
                  <Post {...post} onCommentClick={() => {}} />
                </div>
              )}

              <div className="p-4">
                <h3 className="font-medium mb-4">
                  {comments.length > 0
                    ? `${comments.length} comentario${comments.length !== 1 ? "s" : ""}`
                    : "No hay comentarios aún"}
                </h3>

                {comments.map((comment) => (
                  <div key={comment.id} className="mb-4 flex">
                    <Avatar
                      className="h-8 w-8 mr-3 flex-shrink-0 cursor-pointer"
                      onClick={() => router.push(`/profile/${comment.user.username || comment.user.id}`)}
                    >
                      <AvatarImage src={comment.user.avatarUrl || ""} alt={comment.user.username || "Usuario"} />
                      <AvatarFallback>
                        {(comment.user.username?.[0] || comment.user.fullName?.[0] || "U").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="bg-neutral-100 p-3 rounded-lg">
                        <div
                          className="font-medium text-sm cursor-pointer hover:underline"
                          onClick={() => router.push(`/profile/${comment.user.username || comment.user.id}`)}
                        >
                          {comment.user.fullName || comment.user.username || "Usuario"}
                        </div>
                        <div className="text-sm">{comment.content}</div>
                      </div>
                      <div className="text-xs text-neutral-500 mt-1">
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: es })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="p-4 border-t">
              <div className="flex w-full space-x-2">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Escribe un comentario..."
                  className="flex-1 resize-none"
                  disabled={isSubmitting}
                />
                <Button onClick={handleSubmitComment} disabled={!newComment.trim() || isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar"}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
