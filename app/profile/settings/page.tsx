"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import UserProfileSettings from "@/components/user-profile-settings"

export default function ProfileSettingsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.push("/")
    }
  }, [user, router, loading])

  return <UserProfileSettings />
}
