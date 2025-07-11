import type React from "react"
import { ThemeProvider } from "@/components/theme-provider"


export const metadata = {
  title: "Mily",
  description: "Una aplicación para registrar tus comidas diarias",
  icons: {
    icon: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/MilyFavicon-DpxuvajmQ2lF6aXQSNHUEzsGUVJn0O.png",
    apple: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/MilyFavicon-DpxuvajmQ2lF6aXQSNHUEzsGUVJn0O.png",
    shortcut: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/MilyFavicon-DpxuvajmQ2lF6aXQSNHUEzsGUVJn0O.png",
  },
}

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <div className="min-h-screen w-100">
        {children}
      </div>
    </ThemeProvider>)
}
