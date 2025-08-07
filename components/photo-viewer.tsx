"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X, ZoomIn, ZoomOut, RotateCw, Download, Share2 } from "lucide-react"

interface PhotoViewerProps {
  src: string
  alt: string
  isOpen: boolean
  onClose: () => void
}

export default function PhotoViewer({ src, alt, isOpen, onClose }: PhotoViewerProps) {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [showControls, setShowControls] = useState(true)
  const [imageLoaded, setImageLoaded] = useState(false)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setZoom(1)
      setRotation(0)
      setPosition({ x: 0, y: 0 })
      setImageLoaded(false)
      setShowControls(true)
    }
  }, [isOpen])

  // Auto-hide controls on mobile after 3 seconds
  useEffect(() => {
    if (isOpen && showControls) {
      const timer = setTimeout(() => {
        setShowControls(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isOpen, showControls])

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.5, 4))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.5, 0.5))
  }, [])

  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360)
  }, [])

  const handleReset = useCallback(() => {
    setZoom(1)
    setRotation(0)
    setPosition({ x: 0, y: 0 })
  }, [])

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: alt,
          text: `Mira esta foto: ${alt}`,
          url: src,
        })
      } catch (error) {
        console.log("Error sharing:", error)
      }
    }
  }, [alt, src])

  const handleDownload = useCallback(async () => {
    try {
      const response = await fetch(src)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${alt || "imagen"}.jpg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error downloading image:", error)
    }
  }, [src, alt])

  // Touch and mouse event handlers
  const handleStart = useCallback(
    (clientX: number, clientY: number) => {
      if (zoom > 1) {
        setIsDragging(true)
        setDragStart({
          x: clientX - position.x,
          y: clientY - position.y,
        })
      }
      setShowControls(true)
    },
    [zoom, position],
  )

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      if (isDragging && zoom > 1) {
        setPosition({
          x: clientX - dragStart.x,
          y: clientY - dragStart.y,
        })
      }
    },
    [isDragging, zoom, dragStart],
  )

  const handleEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    handleStart(e.clientX, e.clientY)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX, e.clientY)
  }

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault()
    const touch = e.touches[0]
    handleStart(touch.clientX, touch.clientY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault()
    const touch = e.touches[0]
    handleMove(touch.clientX, touch.clientY)
  }

  const handleImageClick = () => {
    setShowControls(!showControls)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-[100vw] max-h-[100vh] w-full h-full p-0 bg-black border-0 m-0"
        aria-labelledby="photo-viewer-title"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only" id="photo-viewer-title">
          Foto ampliada
        </DialogTitle>
        <DialogDescription className="sr-only" id="photo-viewer-desc">
          Vista ampliada de la foto seleccionada. Usa los controles para acercar, rotar o descargar.
        </DialogDescription>
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
          {/* Top Controls */}
          <div
            className={`absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/50 to-transparent p-4 transition-all duration-300 ${showControls ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full"}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium">
                  {Math.round(zoom * 100)}%
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleShare}
                  className="text-white hover:bg-white/20 h-10 w-10 rounded-full"
                >
                  <Share2 className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDownload}
                  className="text-white hover:bg-white/20 h-10 w-10 rounded-full"
                >
                  <Download className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-white hover:bg-white/20 h-10 w-10 rounded-full"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Image Container */}
          <div
            className="relative w-full h-full flex items-center justify-center cursor-pointer"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleEnd}
            onClick={handleImageClick}
          >
            <img
              src={src || "/placeholder.svg"}
              alt={alt}
              className="max-w-full max-h-full object-contain transition-transform duration-200 ease-out select-none"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
                cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "pointer",
              }}
              draggable={false}
              onLoad={() => setImageLoaded(true)}
            />
          </div>

          {/* Bottom Controls */}
          <div
            className={`absolute bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/50 to-transparent p-4 transition-all duration-300 ${showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-full"}`}
          >
            <div className="flex items-center justify-center space-x-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="text-white hover:bg-white/20 h-12 w-12 rounded-full disabled:opacity-50"
              >
                <ZoomOut className="h-5 w-5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleRotate}
                className="text-white hover:bg-white/20 h-12 w-12 rounded-full"
              >
                <RotateCw className="h-5 w-5" />
              </Button>

              <Button
                variant="ghost"
                onClick={handleReset}
                className="text-white hover:bg-white/20 h-12 px-6 rounded-full font-medium"
              >
                Restablecer
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomIn}
                disabled={zoom >= 4}
                className="text-white hover:bg-white/20 h-12 w-12 rounded-full disabled:opacity-50"
              >
                <ZoomIn className="h-5 w-5" />
              </Button>
            </div>

            {/* Instructions */}
            <div className="text-center mt-3">
              <p className="text-white/80 text-sm">
                {zoom > 1 ? "Arrastra para mover • " : ""}Toca para mostrar/ocultar controles
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
