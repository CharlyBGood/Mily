import type React from "react"
import "./globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/lib/auth-context"
import { StorageProvider } from "@/lib/storage-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Mily",
  description: "Una aplicación para registrar tus comidas diarias",
  icons: {
    icon: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/MilyFavicon-DpxuvajmQ2lF6aXQSNHUEzsGUVJn0O.png",
    apple: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/MilyFavicon-DpxuvajmQ2lF6aXQSNHUEzsGUVJn0O.png",
    shortcut: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/MilyFavicon-DpxuvajmQ2lF6aXQSNHUEzsGUVJn0O.png",
  },
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light">
          <AuthProvider>
            <StorageProvider>{children}</StorageProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
