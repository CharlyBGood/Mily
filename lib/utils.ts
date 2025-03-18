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

// Function to generate a shareable image from a DOM element with improved reliability
export async function generateShareableImage(element: HTMLElement): Promise<string | null> {
  try {
    // Make sure the element is visible and has dimensions
    const originalDisplay = element.style.display
    const originalVisibility = element.style.visibility
    const originalPosition = element.style.position
    const originalZIndex = element.style.zIndex

    // Force the element to be visible but off-screen for rendering
    element.style.visibility = "visible"
    element.style.position = "absolute"
    element.style.left = "-9999px"
    element.style.top = "0"
    element.style.zIndex = "-1"
    element.style.display = "block"

    // Add to body temporarily to ensure it's in the DOM
    const parent = element.parentNode
    document.body.appendChild(element)

    // Wait for images to load
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Set background and padding
    element.style.padding = "16px"
    element.style.backgroundColor = "white"
    element.style.borderRadius = "8px"

    // Generate the image
    const dataUrl = await toPng(element, {
      quality: 0.95,
      backgroundColor: "white",
      canvasWidth: element.offsetWidth,
      canvasHeight: element.offsetHeight,
      pixelRatio: 2, // Higher resolution
    })

    // Restore the element to its original state
    if (parent) {
      parent.appendChild(element)
    } else {
      document.body.removeChild(element)
    }

    element.style.display = originalDisplay
    element.style.visibility = originalVisibility
    element.style.position = originalPosition
    element.style.zIndex = originalZIndex
    element.style.padding = ""
    element.style.backgroundColor = ""
    element.style.borderRadius = ""

    return dataUrl
  } catch (error) {
    console.error("Error generating image:", error)
    return null
  }
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

// Function to download an image from a File object
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

