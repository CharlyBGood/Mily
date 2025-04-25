"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, RefreshCw } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseClient } from "@/lib/supabase-client"

interface Notification {
  id: string
  type: "like" | "comment" | "follow"
  message: string
  isRead: boolean
  createdAt: string
  actor: {
    id: string
    username?: string | null
    fullName?: string | null
    avatarUrl?: string | null
  }
  postId?: string
  commentId?: string
}

export default function NotificationList() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      loadNotifications()
    } else {
      setIsLoading(false)
    }
  }, [user])

  const loadNotifications = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      const supabase = getSupabaseClient()

      const { data, error } = await supabase
        .from("notifications")
        .select(`
          id,
          type,
          message,
          is_read,
          created_at,
          post_id,
          comment_id,
          profiles!notifications_actor_id_fkey (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50)

      if (error) throw error

      const formattedNotifications = data.map((notification) => ({
        id: notification.id,
        type: notification.type as "like" | "comment" | "follow",
        message: notification.message,
        isRead: notification.is_read,
        createdAt: notification.created_at,
        actor: {
          id: notification.profiles.id,
          username: notification.profiles.username,
          fullName: notification.profiles.full_name,
          avatarUrl: notification.profiles.avatar_url,
        },
        postId: notification.post_id,
        commentId: notification.comment_id,
      }))

      setNotifications(formattedNotifications)

      // Mark all as read
      if (formattedNotifications.some((n) => !n.isRead)) {
        await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false)
      }
    } catch (error) {
      console.error("Error loading notifications:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las notificaciones",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    loadNotifications()
  }

  const handleNotificationClick = (notification: Notification) => {
    if (notification.type === "follow") {
      router.push(`/profile/${notification.actor.username || notification.actor.id}`)
    } else if (notification.postId) {
      // In a real app, you would navigate to the post detail page
      router.push(`/social?post=${notification.postId}`)
    }
  }

  if (!user) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-medium mb-2">Inicia sesión para ver notificaciones</h3>
        <p className="text-neutral-500 mb-4">Necesitas iniciar sesión para ver tus notificaciones</p>
        <Button onClick={() => router.push("/login")}>Iniciar sesión</Button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Notificaciones</h2>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Actualizar
        </Button>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-neutral-500">No tienes notificaciones</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-3 rounded-lg cursor-pointer hover:bg-neutral-100 transition-colors ${
                !notification.isRead ? "bg-teal-50" : "bg-white"
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-center">
                <Avatar className="h-10 w-10 mr-3">
                  <AvatarImage
                    src={notification.actor.avatarUrl || ""}
                    alt={notification.actor.username || "Usuario"}
                  />
                  <AvatarFallback>
                    {(notification.actor.username?.[0] || notification.actor.fullName?.[0] || "U").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p>
                    <span className="font-medium">
                      {notification.actor.fullName || notification.actor.username || "Usuario"}
                    </span>{" "}
                    {notification.message}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: es })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
