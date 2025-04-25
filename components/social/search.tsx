"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, SearchIcon, UserPlus, UserCheck } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseClient } from "@/lib/supabase-client"

interface SearchResult {
  id: string
  username?: string | null
  fullName?: string | null
  avatarUrl?: string | null
  isFollowing: boolean
}

export default function Search() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [followingStatus, setFollowingStatus] = useState<Record<string, boolean>>({})
  const [isUpdatingFollow, setIsUpdatingFollow] = useState<Record<string, boolean>>({})
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const handleSearch = async () => {
    if (!query.trim()) return

    setIsSearching(true)
    try {
      const supabase = getSupabaseClient()

      // Search for users by username or full name
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
        .limit(20)

      if (error) throw error

      // Check if current user is following each result
      const resultsWithFollowing = await Promise.all(
        data.map(async (profile) => {
          let isFollowing = false

          if (user) {
            const { data: followData, error: followError } = await supabase
              .from("follows")
              .select("id")
              .eq("follower_id", user.id)
              .eq("following_id", profile.id)
              .maybeSingle()

            if (!followError) {
              isFollowing = !!followData
            }
          }

          return {
            id: profile.id,
            username: profile.username,
            fullName: profile.full_name,
            avatarUrl: profile.avatar_url,
            isFollowing,
          }
        }),
      )

      setResults(resultsWithFollowing)

      // Update following status
      const newFollowingStatus: Record<string, boolean> = {}
      resultsWithFollowing.forEach((result) => {
        newFollowingStatus[result.id] = result.isFollowing
      })
      setFollowingStatus(newFollowingStatus)
    } catch (error) {
      console.error("Error searching:", error)
      toast({
        title: "Error",
        description: "No se pudo realizar la búsqueda",
        variant: "destructive",
      })
    } finally {
      setIsSearching(false)
    }
  }

  const handleFollowToggle = async (profileId: string) => {
    if (!user) {
      router.push("/login")
      return
    }

    setIsUpdatingFollow((prev) => ({ ...prev, [profileId]: true }))
    try {
      const supabase = getSupabaseClient()
      const isFollowing = followingStatus[profileId]

      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", profileId)

        if (error) throw error

        setFollowingStatus((prev) => ({ ...prev, [profileId]: false }))

        toast({
          title: "Dejaste de seguir",
          description: "Ya no sigues a este usuario",
        })
      } else {
        // Follow
        const { error } = await supabase.from("follows").insert({
          follower_id: user.id,
          following_id: profileId,
        })

        if (error) throw error

        setFollowingStatus((prev) => ({ ...prev, [profileId]: true }))

        toast({
          title: "Siguiendo",
          description: "Ahora sigues a este usuario",
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
      setIsUpdatingFollow((prev) => ({ ...prev, [profileId]: false }))
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Buscar</h2>

      <div className="flex space-x-2 mb-6">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar usuarios..."
          className="flex-1"
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <Button onClick={handleSearch} disabled={!query.trim() || isSearching}>
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <SearchIcon className="h-4 w-4" />}
        </Button>
      </div>

      {isSearching ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-3">
          {results.map((result) => (
            <div key={result.id} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
              <div
                className="flex items-center flex-1 cursor-pointer"
                onClick={() => router.push(`/profile/${result.username || result.id}`)}
              >
                <Avatar className="h-10 w-10 mr-3">
                  <AvatarImage src={result.avatarUrl || ""} alt={result.username || "Usuario"} />
                  <AvatarFallback>{(result.username?.[0] || result.fullName?.[0] || "U").toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{result.fullName || result.username || "Usuario"}</p>
                  {result.username && <p className="text-sm text-neutral-500">@{result.username}</p>}
                </div>
              </div>

              {user && user.id !== result.id && (
                <Button
                  variant={followingStatus[result.id] ? "outline" : "default"}
                  size="sm"
                  onClick={() => handleFollowToggle(result.id)}
                  disabled={isUpdatingFollow[result.id]}
                  className={followingStatus[result.id] ? "border-teal-600 text-teal-600" : ""}
                >
                  {isUpdatingFollow[result.id] ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : followingStatus[result.id] ? (
                    <UserCheck className="h-4 w-4" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : query.trim() ? (
        <div className="text-center py-8">
          <p className="text-neutral-500">No se encontraron resultados</p>
        </div>
      ) : null}
    </div>
  )
}
