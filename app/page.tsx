"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import MealLogger from "@/components/meal-logger"
import MealHistory from "@/components/meal-history"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, Settings, LogOut, Plus, History, Share2, Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import Link from "next/link"
import { MilyLogo } from "@/components/mily-logo"

export default function HomePage() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [showMealLogger, setShowMealLogger] = useState(false)
  const [activeView, setActiveView] = useState<"logger" | "history">("history")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push("/login")
    }
  }, [user, router])

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const handleShare = () => {
    if (user?.id) {
      const shareUrl = `${window.location.origin}/share/${user.id}`
      navigator.clipboard.writeText(shareUrl)
      // You could add a toast notification here
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-blue-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    )
  }

  const navigationItems = [
    { icon: User, label: "Perfil", href: "/profile" },
    { icon: Settings, label: "Configuración", href: "/settings" },
    { icon: Share2, label: "Compartir", onClick: handleShare },
    { icon: LogOut, label: "Cerrar Sesión", onClick: handleSignOut, variant: "destructive" as const },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50">
      {/* Mobile Header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-3 sm:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <MilyLogo className="h-8 w-8" />
            <div>
              <h1 className="text-lg font-bold text-gray-900">Mily</h1>
              <p className="text-xs text-gray-600">¡Hola, {user.email?.split("@")[0]}!</p>
            </div>
          </div>

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-0">
              <div className="flex flex-col h-full">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <MilyLogo className="h-10 w-10" />
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">Mily</h2>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 p-4">
                  <nav className="space-y-2">
                    {navigationItems.map((item, index) => (
                      <div key={index}>
                        {item.href ? (
                          <Link href={item.href} onClick={() => setMobileMenuOpen(false)}>
                            <Button variant="ghost" className="w-full justify-start h-12 px-4 text-left">
                              <item.icon className="h-5 w-5 mr-3" />
                              {item.label}
                            </Button>
                          </Link>
                        ) : (
                          <Button
                            variant="ghost"
                            className={`w-full justify-start h-12 px-4 text-left ${
                              item.variant === "destructive" ? "text-red-600 hover:text-red-700 hover:bg-red-50" : ""
                            }`}
                            onClick={() => {
                              item.onClick?.()
                              setMobileMenuOpen(false)
                            }}
                          >
                            <item.icon className="h-5 w-5 mr-3" />
                            {item.label}
                          </Button>
                        )}
                      </div>
                    ))}
                  </nav>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden sm:block sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <MilyLogo className="h-10 w-10" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Mily</h1>
                <p className="text-sm text-gray-600">¡Hola, {user.email?.split("@")[0]}!</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Link href="/profile">
                <Button variant="ghost" size="sm">
                  <User className="h-4 w-4 mr-2" />
                  Perfil
                </Button>
              </Link>
              <Link href="/settings">
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Configuración
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Compartir
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* View Toggle */}
        <div className="mb-6 sm:mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <div className="flex items-center space-x-2 overflow-x-auto">
                  <Button
                    variant={activeView === "history" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveView("history")}
                    className="flex-shrink-0 h-10 px-4"
                  >
                    <History className="h-4 w-4 mr-2" />
                    Historial
                  </Button>
                  <Button
                    variant={activeView === "logger" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveView("logger")}
                    className="flex-shrink-0 h-10 px-4"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Comida
                  </Button>
                </div>

                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="bg-teal-100 text-teal-800 border-teal-200">
                    {activeView === "history" ? "Viendo historial" : "Agregando comida"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Area */}
        <div className="space-y-6">
          {activeView === "logger" && (
            <div className="w-full">
              <MealLogger onMealAdded={() => setActiveView("history")} />
            </div>
          )}

          {activeView === "history" && (
            <div className="w-full">
              <MealHistory />
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 pb-safe">
        <div className="flex items-center justify-around py-2">
          <Button
            variant={activeView === "history" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveView("history")}
            className="flex-col h-16 w-20 p-2"
          >
            <History className="h-5 w-5 mb-1" />
            <span className="text-xs">Historial</span>
          </Button>
          <Button
            variant={activeView === "logger" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveView("logger")}
            className="flex-col h-16 w-20 p-2"
          >
            <Plus className="h-5 w-5 mb-1" />
            <span className="text-xs">Agregar</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
