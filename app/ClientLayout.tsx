"use client"
import "./globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/lib/auth-context"
import { CycleSettingsProvider } from "@/lib/cycle-settings-context"
import { MealProvider } from "@/lib/meal-context"
import React from "react"

const inter = Inter({ subsets: ["latin"] })

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  // Add favicon and meta tags via useEffect for client-side
  React.useEffect(() => {
    // Set favicon
    const favicon = document.querySelector('link[rel="icon"]') || document.createElement("link")
    favicon.setAttribute("rel", "icon")
    favicon.setAttribute("href", "/MiliFinalFinalFinalFinal.svg")
    favicon.setAttribute("type", "image/svg+xml")
    if (!document.querySelector('link[rel="icon"]')) {
      document.head.appendChild(favicon)
    }

    // Set apple touch icon
    const appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]') || document.createElement("link")
    appleTouchIcon.setAttribute("rel", "apple-touch-icon")
    appleTouchIcon.setAttribute("href", "/MiliFinalFinalFinalFinal.svg")
    if (!document.querySelector('link[rel="apple-touch-icon"]')) {
      document.head.appendChild(appleTouchIcon)
    }

    // Set title
    document.title = "Mily - Registro de Comidas"

    // Set theme color
    const themeColor = document.querySelector('meta[name="theme-color"]') || document.createElement("meta")
    themeColor.setAttribute("name", "theme-color")
    themeColor.setAttribute("content", "#0d9488")
    if (!document.querySelector('meta[name="theme-color"]')) {
      document.head.appendChild(themeColor)
    }

    // Set viewport for iPhone
    const viewport = document.querySelector('meta[name="viewport"]')
    if (viewport) {
      viewport.setAttribute("content", "width=device-width, initial-scale=1, viewport-fit=cover")
    }
  }, [])

  return (
    <html lang="es" suppressHydrationWarning>
      {/* Document <head> */}
      <head>
        {/* Favicon / icons */}
        {/* Mobile & theme config */}
      </head>

      <body className={inter.className} suppressHydrationWarning>
        {/* Global providers */}
        <ThemeProvider attribute="class" defaultTheme="light">
          <AuthProvider>
            <CycleSettingsProvider>
              <MealProvider>{children}</MealProvider>
            </CycleSettingsProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
