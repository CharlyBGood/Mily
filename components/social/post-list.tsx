"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { getSupabaseClient } from "@/lib/supabase-client"
import Post, { type PostProps } from "./post"
import PostDetail from "./post-detail"

interface PostListProps {
  userId?: string // Optional: to filter posts by a specific user
}

export default function PostList({ userId }: PostListProps) {
  const [posts, setPosts] = useState<PostProps[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedPost, setSelectedPost] = useState<string | null>(null)
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    loadPosts()
  }, [userId])

  const loadPosts = async () => {
    setIsLoading(true)
    try {
      const supabase = getSupabaseClient()

      // Build the query
      let query = supabase
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
        .order("created_at", { ascending: false })
        .not("is_archived", "eq", true)

      // Filter by user if userId is provided
      if (userId) {
        query = query.eq("user_id", userId)
      }

      const { data: postsData, error } = await query

      if (error) throw error

      // Get like counts and comment counts for each post
      const postsWithCounts = await Promise.all(
        postsData.map(async (post) => {
          // Get like count
          const { count: likeCount, error: likeError } = await supabase
            .from("likes")
            .select("*", { count: "exact", head: true })
            .eq("post_id", post.id)

          if (likeError) console.error("Error fetching like count:", likeError)

          // Get comment count
          const { count: commentCount, error: commentError } = await supabase
            .from("comments")
            .select("*", { count: "exact", head: true })
            .eq("post_id", post.id)
            .not("is_archived", "eq", true)

          if (commentError) console.error("Error fetching comment count:", commentError)

          // Check if current user has liked the post
          let isLiked = false
          if (user) {
            const { data: likeData, error: userLikeError } = await supabase
              .from("likes")
              .select("id")
              .eq("post_id", post.id)
              .eq("user_id", user.id)
              .maybeSingle()

            if (!userLikeError) {
              isLiked = !!likeData
            }
          }

          return {
            id: post.id,
            content: post.content,
            imageUrl: post.image_url,
            createdAt: post.created_at,
            user: {
              id: post.profiles.id,
              username: post.profiles.username,
              fullName: post.profiles.full_name,
              avatarUrl: post.profiles.avatar_url,
            },
            likeCount: likeCount || 0,
            commentCount: commentCount || 0,
            isLiked,
          }
        }),
      )

      setPosts(postsWithCounts)
    } catch (error) {
      console.error("Error loading posts:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las publicaciones",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    loadPosts()
  }

  const handleCommentClick = (postId: string) => {
    setSelectedPost(postId)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-medium mb-2">No hay publicaciones</h3>
        <p className="text-neutral-500 mb-4">
          {userId
            ? "Este usuario aún no ha publicado nada"
            : "Aún no hay publicaciones. ¡Sé el primero en compartir algo!"}
        </p>
        <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
          {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Actualizar
        </Button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Actualizar
        </Button>
      </div>

      {posts.map((post) => (
        <Post key={post.id} {...post} onCommentClick={() => handleCommentClick(post.id)} />
      ))}

      {selectedPost && <PostDetail postId={selectedPost} onClose={() => setSelectedPost(null)} onUpdate={loadPosts} />}
    </div>
  )
}
