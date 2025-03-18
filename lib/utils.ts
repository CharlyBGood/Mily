import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getMealTypeLabel(type: string) {
  const types: Record<string, string> = {
    desayuno: "Desayuno",
    colacion1: "Colación",
    almuerzo: "Almuerzo",
    postre1: "Postre",
    merienda: "Merienda",
    colacion2: "Colación",
    cena: "Cena",
    postre2: "Postre",
  }
  return types[type] || type
}

// Function to share content using the Web Share API if available
export async function shareContent(title: string, text: string, url?: string, files?: File[]) {
  // Check if Web Share API is available
  if (navigator.share) {
    try {
      const shareData: ShareData = {
        title,
        text,
        url,
      }

      // Check if file sharing is supported
      if (files && files.length > 0 && navigator.canShare && navigator.canShare({ files })) {
        shareData.files = files
      } else if (files && files.length > 0) {
        // If file sharing is not supported, fall back to downloading
        downloadImage(files[0])
        return { success: true, fallback: true }
      }

      await navigator.share(shareData)
      return { success: true }
    } catch (error) {
      console.error("Error sharing:", error)
      return { success: false, error }
    }
  } else {
    // Fallback for browsers that don't support Web Share API
    if (files && files.length > 0) {
      downloadImage(files[0])
      return { success: true, fallback: true }
    }
    return { success: false, error: "Web Share API not supported" }
  }
}

// Function to download an image from a File object or URL
export function downloadImage(fileOrUrl: File | string, filename?: string) {
  try {
    const url = typeof fileOrUrl === "string" ? fileOrUrl : URL.createObjectURL(fileOrUrl)

    const link = document.createElement("a")
    link.href = url
    link.download = filename || (typeof fileOrUrl === "string" ? "nutri-meal.png" : fileOrUrl.name || "nutri-meal.png")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Clean up the URL object if we created one
    if (typeof fileOrUrl !== "string") {
      URL.revokeObjectURL(url)
    }
  } catch (error) {
    console.error("Error downloading image:", error)
  }
}

// Helper function to check if localStorage is available
export function isLocalStorageAvailable() {
  try {
    const testKey = "__test__"
    localStorage.setItem(testKey, testKey)
    localStorage.removeItem(testKey)
    return true
  } catch (e) {
    return false
  }
}

