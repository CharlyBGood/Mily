import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { toPng } from "html-to-image"

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

// Function to generate a shareable image from a DOM element
export async function generateShareableImage(element: HTMLElement): Promise<string | null> {
  try {
    // Add some padding and set background color
    const originalStyle = element.style.cssText
    element.style.padding = "16px"
    element.style.backgroundColor = "white"
    element.style.borderRadius = "8px"

    const dataUrl = await toPng(element, {
      quality: 0.95,
      backgroundColor: "white",
      width: element.offsetWidth,
      height: element.offsetHeight,
    })

    // Restore original style
    element.style.cssText = originalStyle

    return dataUrl
  } catch (error) {
    console.error("Error generating image:", error)
    return null
  }
}

// Function to share content using the Web Share API if available
export async function shareContent(title: string, text: string, url?: string, files?: File[]) {
  if (navigator.share) {
    try {
      const shareData: ShareData = {
        title,
        text,
        url,
      }

      if (files && files.length > 0) {
        shareData.files = files
      }

      await navigator.share(shareData)
      return { success: true }
    } catch (error) {
      console.error("Error sharing:", error)
      return { success: false, error }
    }
  } else {
    return { success: false, error: "Web Share API not supported" }
  }
}

// Function to download an image
export function downloadImage(dataUrl: string, filename: string) {
  const link = document.createElement("a")
  link.href = dataUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
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

