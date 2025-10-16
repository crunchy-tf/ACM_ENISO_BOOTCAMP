/**
 * Story Overlay Component
 * Displays Agent Kira's mission briefings and story segments with typewriter effects
 */

"use client"

import { useEffect, useState } from "react"
import { X, Radio, SkipForward } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useTypewriter } from "@/hooks/use-typewriter"

interface StoryOverlayProps {
  isOpen: boolean
  title: string
  story: string
  actName?: string
  missionNumber?: number
  agentName?: string
  onClose: () => void
  onAcknowledge?: () => void
}

export function StoryOverlay({
  isOpen,
  title,
  story,
  actName,
  missionNumber,
  agentName = "Agent Kira",
  onClose,
  onAcknowledge
}: StoryOverlayProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [showContent, setShowContent] = useState(false)
  
  // Typewriter effect for title
  const { displayedText: displayedTitle, isComplete: titleComplete, skip: skipTitle } = useTypewriter({
    text: title,
    speed: 40,
    delay: 300,
    onComplete: () => setShowContent(true)
  })
  
  // Typewriter effect for story
  const { displayedText: displayedStory, isComplete: storyComplete, skip: skipStory } = useTypewriter({
    text: story,
    speed: 20,
    delay: showContent ? 200 : 10000
  })

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      setTimeout(() => setIsAnimating(true), 50)
    } else {
      setIsAnimating(false)
      setShowContent(false)
      setTimeout(() => setIsVisible(false), 300)
    }
  }, [isOpen])

  if (!isVisible) return null

  const handleClose = () => {
    setIsAnimating(false)
    setTimeout(() => {
      onClose()
    }, 300)
  }

  const handleAcknowledge = () => {
    if (onAcknowledge) {
      onAcknowledge()
    }
    handleClose()
  }
  
  const handleSkip = () => {
    skipTitle()
    skipStory()
  }
  
  const isFullyComplete = titleComplete && storyComplete

  // Parse story for special formatting
  const renderStory = (text: string) => {
    // Split by double newlines for paragraphs
    const paragraphs = text.split('\n\n').filter(p => p.trim())
    
    return paragraphs.map((para, idx) => {
      // Check for emphasized text (surrounded by *)
      const emphasized = para.replace(/\*([^*]+)\*/g, '<span class="text-yellow-400 font-semibold">$1</span>')
      
      // Check for quoted text (lines starting with >)
      if (para.startsWith('>')) {
        return (
          <blockquote
            key={idx}
            className="border-l-4 border-cyan-500 pl-4 my-3 text-cyan-300 italic"
            dangerouslySetInnerHTML={{ __html: emphasized.replace(/^>\s*/, '') }}
          />
        )
      }
      
      // Check for code/file references (surrounded by `)
      const withCode = emphasized.replace(/`([^`]+)`/g, '<code class="text-green-400 bg-green-950/30 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
      
      return (
        <p
          key={idx}
          className="mb-4 last:mb-0 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: withCode }}
        />
      )
    })
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 transition-all duration-300",
        isAnimating ? "bg-black/80 backdrop-blur-sm" : "bg-black/0 backdrop-blur-none"
      )}
      onClick={handleClose}
    >
      <Card
        className={cn(
          "relative w-full max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden transition-all duration-300 transform",
          "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900",
          "border-2 border-cyan-500/30 shadow-2xl shadow-cyan-500/20",
          isAnimating
            ? "scale-100 opacity-100 translate-y-0"
            : "scale-95 opacity-0 translate-y-4"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-cyan-900/50 to-blue-900/50 border-b-2 border-cyan-500/30 p-4 sm:p-6">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 sm:top-4 sm:right-4 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 z-10"
            onClick={handleClose}
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>

          {/* Act badge */}
          {actName && (
            <div className="inline-flex items-center gap-2 px-2 sm:px-3 py-1 mb-2 sm:mb-3 text-xs font-mono font-semibold text-cyan-400 bg-cyan-950/50 border border-cyan-500/30 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span className="hidden sm:inline">{actName}</span>
              <span className="sm:hidden">{actName.split(' ')[0]}</span>
            </div>
          )}

          {/* Mission info */}
          <div className="flex items-start gap-2 sm:gap-3 mb-2 pr-20">
            <Radio className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-400 mt-1 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              {missionNumber && (
                <div className="text-xs sm:text-sm font-mono text-cyan-300/70 mb-1">
                  MISSION #{missionNumber.toString().padStart(2, '0')}
                </div>
              )}
              <h2 className="text-lg sm:text-2xl font-bold text-white tracking-tight">
                {displayedTitle}
                {!titleComplete && <span className="animate-pulse">|</span>}
              </h2>
            </div>
          </div>

          {/* Agent name */}
          <div className="flex items-center gap-2 text-xs sm:text-sm text-cyan-300/80 mt-2 sm:mt-3">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="font-medium truncate">{agentName}</span>
          </div>
          
          {/* Skip button */}
          {!isFullyComplete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="absolute top-2 right-10 sm:top-4 sm:right-16 text-cyan-400/60 hover:text-cyan-300 hover:bg-cyan-500/10 text-xs gap-1 px-2 py-1 h-auto"
            >
              <SkipForward className="h-3 w-3" />
              <span className="hidden sm:inline">Skip</span>
            </Button>
          )}
        </div>

        {/* Story content */}
        <div className="overflow-y-auto max-h-[calc(85vh-16rem)] sm:max-h-[calc(85vh-18rem)] p-6 custom-scrollbar">
          <div className="text-gray-200 text-base leading-loose">
            {renderStory(displayedStory)}
            {!storyComplete && showContent && <span className="animate-pulse text-cyan-400">▊</span>}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-cyan-500/30 bg-slate-900/50 p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
            <div className="text-xs text-cyan-400/60 font-mono text-center sm:text-left order-2 sm:order-1">
              <span className="hidden sm:inline">ORION INTELLIGENCE • CLASSIFIED</span>
              <span className="sm:hidden">CLASSIFIED</span>
            </div>
            
            <div className="flex gap-2 sm:gap-3 order-1 sm:order-2">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1 sm:flex-none border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 text-sm sm:text-base"
                size="sm"
              >
                <span className="hidden sm:inline">Review Later</span>
                <span className="sm:hidden">Later</span>
              </Button>
              <Button
                onClick={handleAcknowledge}
                disabled={!isFullyComplete}
                className="flex-1 sm:flex-none bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                size="sm"
              >
                <span className="hidden sm:inline">Acknowledge & Begin</span>
                <span className="sm:hidden">Begin</span>
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.5);
          border-radius: 4px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(34, 211, 238, 0.3);
          border-radius: 4px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(34, 211, 238, 0.5);
        }
      `}</style>
    </div>
  )
}
