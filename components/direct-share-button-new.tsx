"use client"

import type React from "react"
import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"

interface DirectShareButtonProps {
  compact?: boolean
}

export default function DirectShareButtonNew({ compact = false }: DirectShareButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState("")
  const [selectedCycle, setSelectedCycle] = useState("all")
  const [isCopied, setIsCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const { user } = useAuth()
  const { toast } = useToast()

  // Function to handle button click
  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault()
    console.log("Share button clicked")
    setIsDialogOpen(true)
    generateShareUrl("all") // Default to all cycles
  }

  // Function to generate share URL
  const generateShareUrl = (cycleOption: string) => {
    console.log("Generating share URL for cycle:", cycleOption)
    setIsLoading(true)

    try {
      if (!user) {
        console.log("No user found")
        toast({
          title: "Error",
          description: "Debes iniciar sesión para compartir tu historial",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // Create share URL with the user ID
      const baseUrl = window.location.origin
      let url = `${baseUrl}/share/${user.id}`

      // Add cycle parameter if a specific cycle is selected
      if (cycleOption !== "all") {
        url += `?cycle=${cycleOption}`
      }

      console.log("Generated URL:", url)
      setShareUrl(url)
    } catch (error) {
      console.error("Error generating share URL:", error)
      toast({
        title: "Error",
        description: "No se pudo generar el enlace para compartir",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Function to copy URL to clipboard
  const copyToClipboard = () => {
    console.log("Copying to clipboard:", shareUrl)
    if (!shareUrl) return

    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        setIsCopied(true)
        toast({
          title: "Enlace copiado",
          description: "El enlace ha sido copiado al portapapeles",
        })

        // Reset copied state after 3 seconds
        setTimeout(() => {
          setIsCopied(false)
        }, 3000)
      })
      .catch((err) => {
        console.error("Error copying to clipboard:", err)
        toast({
          title: "Error",
          description: "No se pudo copiar el enlace",
          variant: "destructive",
        })
      })
  }

  // Function to open share link in new tab
  const openShareLink = () => {
    console.log("Opening share link:", shareUrl)
    if (!shareUrl) return
    window.open(shareUrl, "_blank")
    setIsDialogOpen(false)
  }

  // Function to handle cycle selection change
  const handleCycleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    console.log("Cycle selection changed to:", value)
    setSelectedCycle(value)
    generateShareUrl(value)
  }

  // Function to close dialog
  const closeDialog = () => {
    console.log("Closing dialog")
    setIsDialogOpen(false)
  }

  return (
    <div className="relative">
      {/* Simple button with direct onClick handler */}
      <button
        className={`bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded flex items-center ${
          compact ? "text-sm py-1 px-3" : ""
        }`}
        onClick={handleButtonClick}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 mr-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
        {!compact && <span>Compartir</span>}
      </button>

      {/* Simple dialog implementation */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Compartir historial</h2>
              <button onClick={closeDialog} className="text-gray-500 hover:text-gray-700">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-gray-600 mb-4">
              Comparte tu historial de comidas con quien quieras mediante este enlace
            </p>

            <div className="mb-4">
              <label htmlFor="cycle-select" className="block text-sm font-medium text-gray-700 mb-1">
                ¿Qué quieres compartir?
              </label>
              <select
                id="cycle-select"
                value={selectedCycle}
                onChange={handleCycleChange}
                disabled={isLoading}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="all">Todo el historial</option>
                <option value="current">Ciclo actual</option>
                <option value="1">Ciclo 1</option>
                <option value="2">Ciclo 2</option>
                <option value="3">Ciclo 3</option>
                <option value="4">Ciclo 4</option>
                <option value="5">Ciclo 5</option>
              </select>
            </div>

            <div className="mb-6">
              <label htmlFor="share-url" className="block text-sm font-medium text-gray-700 mb-1">
                Enlace para compartir
              </label>
              <div className="flex">
                <input
                  id="share-url"
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 p-2 border border-gray-300 rounded-l-md font-mono text-sm"
                  placeholder={isLoading ? "Generando enlace..." : "Enlace de compartir"}
                />
                <button
                  onClick={copyToClipboard}
                  disabled={!shareUrl || isLoading}
                  className="bg-gray-200 hover:bg-gray-300 p-2 rounded-r-md"
                  title="Copiar enlace"
                >
                  {isLoading ? (
                    <div className="animate-spin h-5 w-5 border-b-2 border-gray-800 rounded-full"></div>
                  ) : isCopied ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-green-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={closeDialog}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded"
              >
                Cerrar
              </button>
              <button
                onClick={openShareLink}
                disabled={!shareUrl || isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                Abrir enlace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
