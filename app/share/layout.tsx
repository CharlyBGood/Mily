import type React from "react"
import { ThemeProvider } from "@/components/theme-provider"


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
