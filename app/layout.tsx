import type { ReactNode } from "react"
import type { Metadata } from "next"
import ClientLayout from "./ClientLayout"
import "./globals.css"

/**
 * Global metadata (favicons, OG, Twitter cards, etc.)
 * These tags are automatically injected into <head> by Next.js.
 */
export const metadata: Metadata = {
  title: "Mily",
  description: "Mily, lleva un registro de tus comidas.",
  themeColor: "#0d9488",
  icons: {
    icon: "/MiliFinalFinalFinalFinal.svg",
    shortcut: "/MiliFinalFinalFinalFinal.svg",
    apple: "https://res.cloudinary.com/dr8pwzxzn/image/upload/v1752506646/MiliFinalFinalFinalFinal_pkdza3.svg",
  },
  openGraph: {
    type: "website",
    title: "Mily - Registro de Comidas",
    description: "Mily, lleva un registro de tus comidas.",
    images: [
      {
        url: "https://res.cloudinary.com/dr8pwzxzn/image/upload/v1752506646/MiliFinalFinalFinalFinal_pkdza3.svg",
        width: 1200,
        height: 630,
        alt: "Mily App Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mily - Registro de Comidas",
    description: "Mily, lleva un registro de tus comidas.",
    images: ["https://res.cloudinary.com/dr8pwzxzn/image/upload/v1752506646/MiliFinalFinalFinalFinal_pkdza3.svg"],
  },
    generator: 'v0.dev'
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">
        {/* All context providers & theme logic live inside ClientLayout */}
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
