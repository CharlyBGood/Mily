"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Home, Bell, Search, User } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import MilyLogo from "@/components/mily-logo"
import CreatePost from "@/components/social/create-post"
import PostList from "@/components/social/post-list"
import NotificationList from "@/components/social/notification-list"
import SearchComponent from "@/components/social/search"

export default function SocialPage() {
  const [activeTab, setActiveTab] = useState<"feed" | "notifications" | "search">("feed")
  const [refreshKey, setRefreshKey] = useState(0)
  const { user } = useAuth()
  const router = useRouter()

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      <header className="p-4 border-b bg-white flex justify-between items-center">
        <div className="w-10"></div> {/* Spacer for centering */}
        <MilyLogo />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(user ? `/profile/${user.user_metadata?.username || user.id}` : "/login")}
        >
          <User className="h-5 w-5" />
        </Button>
      </header>

      <main className="flex-1 overflow-auto pb-20">
        <div className="max-w-lg mx-auto p-4">
          {activeTab === "feed" && (
            <>
              <CreatePost onPostCreated={handleRefresh} />
              <PostList key={refreshKey} />
            </>
          )}

          {activeTab === "notifications" && <NotificationList key={refreshKey} />}

          {activeTab === "search" && <SearchComponent />}
        </div>
      </main>

      <footer className="border-t bg-white fixed bottom-0 left-0 right-0 z-10 shadow-md">
        <div className="flex justify-around py-2">
          <Button
            variant={activeTab === "feed" ? "default" : "ghost"}
            size="icon"
            onClick={() => setActiveTab("feed")}
            className={activeTab === "feed" ? "bg-teal-600 hover:bg-teal-700" : ""}
          >
            <Home className="h-5 w-5" />
          </Button>
          <Button
            variant={activeTab === "search" ? "default" : "ghost"}
            size="icon"
            onClick={() => setActiveTab("search")}
            className={activeTab === "search" ? "bg-teal-600 hover:bg-teal-700" : ""}
          >
            <Search className="h-5 w-5" />
          </Button>
          <Button
            variant={activeTab === "notifications" ? "default" : "ghost"}
            size="icon"
            onClick={() => setActiveTab("notifications")}
            className={activeTab === "notifications" ? "bg-teal-600 hover:bg-teal-700" : ""}
          >
            <Bell className="h-5 w-5" />
          </Button>
        </div>
        <div className="h-safe-area w-full bg-white"></div>
      </footer>
    </div>
  )
}
