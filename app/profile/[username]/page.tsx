"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Settings, UserPlus, UserCheck, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { getSupabaseClient } from "@/lib/supabase-client"
import MilyLogo from "@/components/mily-logo"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { UserProfile } from "@/lib/auth-context"
import PostList from "@/components/social/post-list"

export default function ProfilePage() {
  const { username } = useParams() as { username: string }
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isUpdatingFollow, setIsUpdatingFollow] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [activeTab, setActiveTab] = useState("posts")
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true)
      try {
        const supabase = getSupabaseClient()

        // Get profile by username
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("username", username)
          .single()

        if (profileError || !profileData) {
          console.error("Error fetching profile:", profileError)
          toast({
            title: "Error",
            description: "No se pudo encontrar el perfil",
            variant: "destructive",
          })
          router.push("/")
          return
        }

        setProfile(profileData)

        // Get follower count
        const { count: followers, error: followersError } = await supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", profileData.id)

        if (!followersError) {
          setFollowerCount(followers || 0)
        }

        // Get following count
        const { count: following, error: followingError } = await supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", profileData.id)

        if (!followingError) {
          setFollowingCount(following || 0)
        }

        // Check if current user is following this profile
        if (user) {
          const { data: followData, error: followError } = await supabase
            .from("follows")
            .select("*")
            .eq("follower_id", user.id)
            .eq("following_id", profileData.id)
            .maybeSingle()

          if (!followError) {
            setIsFollowing(!!followData)
          }
        }
      } catch (error) {
        console.error("Error in fetchProfile:", error)
        toast({
          title: "Error",
          description: "Ocurrió un error al cargar el perfil",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (username) {
      fetchProfile()
    }
  }, [username, user, toast, router])

  const handleFollowToggle = async () => {
    if (!user) {
      router.push("/login")
      return
    }

    if (!profile) return

    setIsUpdatingFollow(true)
    try {
      const supabase = getSupabaseClient()

      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", profile.id)

        if (error) throw error

        setIsFollowing(false)
        setFollowerCount((prev) => Math.max(0, prev - 1))

        toast({
          title: "Dejaste de seguir",
          description: `Ya no sigues a ${profile.username || profile.full_name || "este usuario"}`,
        })
      } else {
        // Follow
        const { error } = await supabase.from("follows").insert({
          follower_id: user.id,
          following_id: profile.id,
        })

        if (error) throw error

        setIsFollowing(true)
        setFollowerCount((prev) => prev + 1)

        toast({
          title: "Siguiendo",
          description: `Ahora sigues a ${profile.username || profile.full_name || "este usuario"}`,
        })
      }
    } catch (error) {
      console.error("Error toggling follow:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el seguimiento",
        variant: "destructive",
      })
    } finally {
      setIsUpdatingFollow(false)
    }
  }

  const isOwnProfile = user && profile && user.id === profile.id

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-neutral-50">
        <header className="p-4 border-b bg-white flex items-center">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 flex justify-center">
            <MilyLogo />
          </div>
          <div className="w-10"></div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </main>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex flex-col min-h-screen bg-neutral-50">
        <header className="p-4 border-b bg-white flex items-center">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 flex justify-center">
            <MilyLogo />
          </div>
          <div className="w-10"></div>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <Card>
            <CardContent className="p-6 text-center">
              <h2 className="text-xl font-semibold mb-2">Perfil no encontrado</h2>
              <p className="text-neutral-600 mb-4">El perfil que buscas no existe o no está disponible.</p>
              <Button onClick={() => router.push("/")}>Volver al inicio</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      <header className="p-4 border-b bg-white flex items-center">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 flex justify-center">
          <MilyLogo />
        </div>
        {isOwnProfile ? (
          <Button variant="ghost" size="icon" onClick={() => router.push("/settings")}>
            <Settings className="h-5 w-5" />
          </Button>
        ) : (
          <div className="w-10"></div>
        )}
      </header>

      <main className="flex-1 flex flex-col">
        <div className="p-4 border-b bg-white">
          <div className="flex items-center mb-4">
            <Avatar className="h-20 w-20 mr-4">
              <AvatarImage src={profile.avatar_url || ""} alt={profile.username || "Usuario"} />
              <AvatarFallback>{(profile.username?.[0] || profile.full_name?.[0] || "U").toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-xl font-bold">{profile.full_name || profile.username}</h1>
              {profile.username && <p className="text-neutral-600">@{profile.username}</p>}
            </div>
            {!isOwnProfile && (
              <Button
                onClick={handleFollowToggle}
                variant={isFollowing ? "outline" : "default"}
                disabled={isUpdatingFollow}
                className={isFollowing ? "border-teal-600 text-teal-600" : ""}
              >
                {isUpdatingFollow ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : isFollowing ? (
                  <UserCheck className="h-4 w-4 mr-2" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-2" />
                )}
                {isFollowing ? "Siguiendo" : "Seguir"}
              </Button>
            )}
          </div>

          {profile.bio && <p className="mb-4">{profile.bio}</p>}

          <div className="flex space-x-4 text-sm">
            <div>
              <span className="font-bold">{followerCount}</span> <span className="text-neutral-600">seguidores</span>
            </div>
            <div>
              <span className="font-bold">{followingCount}</span> <span className="text-neutral-600">siguiendo</span>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="w-full grid grid-cols-2 bg-white border-b rounded-none">
            <TabsTrigger value="posts">Publicaciones</TabsTrigger>
            <TabsTrigger value="meals">Comidas</TabsTrigger>
          </TabsList>
          <TabsContent value="posts" className="p-4">
            <PostList userId={profile.id} />
          </TabsContent>
          <TabsContent value="meals" className="p-4">
            {/* We'll reuse the existing meal history component but filtered for this user */}
            <div className="text-center py-8">
              <h3 className="text-lg font-medium mb-2">Comidas compartidas</h3>
              <p className="text-neutral-500">
                Aquí se mostrarán las comidas que {isOwnProfile ? "compartas" : "comparta este usuario"} públicamente
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
