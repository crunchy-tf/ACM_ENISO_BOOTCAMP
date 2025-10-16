/**
 * Less Viewer Component
 * Modal file viewer for 'less' command with keyboard navigation
 */

"use client"

import { useEffect, useRef, useState } from "react"
import { X, ArrowUp, ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface LessViewerProps {
  isOpen: boolean
  filename: string
  content: string
  onClose: () => void
}

export function LessViewer({
  isOpen,
  filename,
  content,
  onClose
}: LessViewerProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [scrollPosition, setScrollPosition] = useState(0)
  const contentRef = useRef<HTMLDivElement>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Handle close with animation
  const handleClose = () => {
    setIsAnimating(false)
    setTimeout(() => {
      onClose()
    }, 300)
  }

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      setScrollPosition(0)
      setTimeout(() => setIsAnimating(true), 50)
    } else {
      setIsAnimating(false)
      setTimeout(() => setIsVisible(false), 300)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyPress = (e: KeyboardEvent) => {
      if (!contentRef.current) return

      const scrollStep = 40
      const pageStep = contentRef.current.clientHeight - 60

      switch (e.key.toLowerCase()) {
        case 'q':
        case 'escape':
          handleClose()
          break
        
        case 'j':
        case 'arrowdown':
          e.preventDefault()
          contentRef.current.scrollBy({ top: scrollStep, behavior: 'smooth' })
          break
        
        case 'k':
        case 'arrowup':
          e.preventDefault()
          contentRef.current.scrollBy({ top: -scrollStep, behavior: 'smooth' })
          break
        
        case 'pagedown':
        case ' ':
          e.preventDefault()
          contentRef.current.scrollBy({ top: pageStep, behavior: 'smooth' })
          break
        
        case 'pageup':
          e.preventDefault()
          contentRef.current.scrollBy({ top: -pageStep, behavior: 'smooth' })
          break
        
        case 'home':
        case 'g':
          e.preventDefault()
          contentRef.current.scrollTo({ top: 0, behavior: 'smooth' })
          break
        
        case 'end':
        case 'G':
          e.preventDefault()
          contentRef.current.scrollTo({
            top: contentRef.current.scrollHeight,
            behavior: 'smooth'
          })
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isOpen, handleClose])

  // Track scroll position
  useEffect(() => {
    if (!contentRef.current || !isOpen) return

    const handleScroll = () => {
      if (contentRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = contentRef.current
        const percentage = Math.round((scrollTop / (scrollHeight - clientHeight)) * 100)
        setScrollPosition(isNaN(percentage) ? 0 : Math.min(100, percentage))
      }

      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }

    const div = contentRef.current
    div.addEventListener('scroll', handleScroll)
    
    // Initial calculation
    handleScroll()

    return () => {
      div.removeEventListener('scroll', handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [isOpen, content])

  if (!isVisible) return null

  // Process content for display
  const lines = content.split('\n')
  const displayContent = lines.map((line, idx) => {
    // Syntax highlighting for common patterns
    let processedLine = line
    
    // Highlight file paths
    processedLine = processedLine.replace(
      /(\/([\w\-./]+)+)/g,
      '<span class="text-cyan-400">$1</span>'
    )
    
    // Highlight timestamps
    processedLine = processedLine.replace(
      /(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2})/g,
      '<span class="text-yellow-400">$1</span>'
    )
    
    // Highlight IPs
    processedLine = processedLine.replace(
      /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/g,
      '<span class="text-green-400">$1</span>'
    )
    
    // Highlight ERROR/WARNING
    processedLine = processedLine.replace(
      /(ERROR|CRITICAL|FAIL)/gi,
      '<span class="text-red-400 font-semibold">$1</span>'
    )
    processedLine = processedLine.replace(
      /(WARNING|WARN)/gi,
      '<span class="text-yellow-400 font-semibold">$1</span>'
    )
    processedLine = processedLine.replace(
      /(SUCCESS|OK|INFO)/gi,
      '<span class="text-green-400 font-semibold">$1</span>'
    )

    return (
      <div
        key={idx}
        className="flex gap-4 px-6 py-0.5 hover:bg-white/5"
      >
        <span className="text-gray-600 select-none min-w-[3rem] text-right font-mono text-sm">
          {(idx + 1).toString().padStart(4, ' ')}
        </span>
        <span
          className="flex-1 font-mono text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: processedLine || '&nbsp;' }}
        />
      </div>
    )
  })

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300",
        isAnimating ? "bg-black/90 backdrop-blur-sm" : "bg-black/0 backdrop-blur-none"
      )}
      onClick={handleClose}
    >
      <Card
        className={cn(
          "relative max-w-6xl w-full h-[90vh] overflow-hidden transition-all duration-300 transform",
          "bg-slate-950 border-2 border-green-500/30 shadow-2xl shadow-green-500/10",
          isAnimating
            ? "scale-100 opacity-100 translate-y-0"
            : "scale-95 opacity-0 translate-y-4"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-green-950/50 to-emerald-950/50 border-b-2 border-green-500/30 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-green-400 font-mono text-sm">less</div>
              <div className="text-gray-500">•</div>
              <div className="text-gray-300 font-mono text-sm truncate max-w-xl">
                {filename}
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
              onClick={handleClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div
          ref={contentRef}
          className="h-[calc(90vh-8rem)] overflow-y-auto bg-black text-gray-100 custom-scrollbar"
        >
          {displayContent}
        </div>

        {/* Footer / Status Bar */}
        <div className="border-t-2 border-green-500/30 bg-gradient-to-r from-green-950/50 to-emerald-950/50 px-6 py-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-6 text-green-400/80 font-mono">
              <span>Line {Math.min(lines.length, Math.floor((scrollPosition / 100) * lines.length) + 1)}/{lines.length}</span>
              <span>{scrollPosition}%</span>
              <span className="text-green-400/60">
                {(content.length / 1024).toFixed(1)} KB
              </span>
            </div>

            <div className="flex items-center gap-4 text-green-400/60 text-xs">
              <div className="flex items-center gap-1">
                <ArrowUp className="h-3 w-3" />
                <ArrowDown className="h-3 w-3" />
                <span>or j/k</span>
              </div>
              <div>Space/PgDn: Page Down</div>
              <div>PgUp: Page Up</div>
              <div>g/G: Top/Bottom</div>
              <div className="text-yellow-400">q: Quit</div>
            </div>
          </div>
        </div>
      </Card>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.5);
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(34, 197, 94, 0.3);
          border-radius: 5px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(34, 197, 94, 0.5);
        }
      `}</style>
    </div>
  )
}
