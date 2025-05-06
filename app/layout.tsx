import type React from "react"
import "./globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/lib/auth-context"
import { StorageProvider } from "@/lib/storage-provider"
import { SettingsProvider } from "@/lib/settings-context"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Mily - Seguimiento Nutricional",
  description: "Aplicación para seguimiento de comidas y ciclos nutricionales",
    generator: 'v0.dev'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <AuthProvider>
            <StorageProvider>
              <SettingsProvider>
                {children}
                <Toaster />
              </SettingsProvider>
            </StorageProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
