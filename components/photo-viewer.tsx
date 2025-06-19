"use client"

import { useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X, ZoomIn, ZoomOut, RotateCw } from "lucide-react"

interface PhotoViewerProps {
  src: string
  alt: string
  isOpen: boolean
  onClose: () => void
}

export default function PhotoViewer({ src, alt, isOpen, onClose }: PhotoViewerProps) {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.5, 3))
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.5, 0.5))
  }

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  const resetView = () => {
    setZoom(1)
    setRotation(0)
  }

  const handleClose = () => {
    resetView()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 bg-black/95 border-0">
        <div className="relative w-full h-full flex flex-col">
          {/* Header with controls */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomOut}
                className="text-white hover:bg-white/20 h-10 w-10"
                disabled={zoom <= 0.5}
              >
                <ZoomOut className="h-5 w-5" />
              </Button>
              <span className="text-white text-sm font-medium min-w-[60px] text-center">{Math.round(zoom * 100)}%</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomIn}
                className="text-white hover:bg-white/20 h-10 w-10"
                disabled={zoom >= 3}
              >
                <ZoomIn className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRotate}
                className="text-white hover:bg-white/20 h-10 w-10"
              >
                <RotateCw className="h-5 w-5" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="text-white hover:bg-white/20 h-10 w-10"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Image container */}
          <div className="flex-1 flex items-center justify-center p-4 pt-16 overflow-hidden">
            <div className="relative max-w-full max-h-full">
              <img
                src={src || "/placeholder.svg"}
                alt={alt}
                className="max-w-full max-h-full object-contain transition-transform duration-200 ease-out"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: "center",
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = "/placeholder.svg?height=400&width=400"
                }}
              />
            </div>
          </div>

          {/* Bottom instructions */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
            <p className="text-white/80 text-sm text-center">Toca fuera de la imagen para cerrar</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
