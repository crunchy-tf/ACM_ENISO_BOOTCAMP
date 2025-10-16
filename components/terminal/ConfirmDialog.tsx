/**
 * Confirm Dialog Component
 * Confirmation dialog for destructive commands
 */

"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  command?: string
  warningLevel?: 'warning' | 'danger' | 'critical'
  saferAlternative?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  command,
  warningLevel = 'warning',
  saferAlternative,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      setTimeout(() => setIsAnimating(true), 50)
    } else {
      setIsAnimating(false)
      setTimeout(() => setIsVisible(false), 300)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel()
      } else if (e.key === 'Enter' && e.ctrlKey) {
        handleConfirm()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isOpen])

  if (!isVisible) return null

  const handleCancel = () => {
    setIsAnimating(false)
    setTimeout(() => {
      onCancel()
    }, 300)
  }

  const handleConfirm = () => {
    setIsAnimating(false)
    setTimeout(() => {
      onConfirm()
    }, 300)
  }

  // Color schemes based on warning level
  const colorScheme = {
    warning: {
      border: 'border-yellow-500/30',
      bg: 'from-yellow-950/50 to-orange-950/50',
      icon: 'text-yellow-400',
      button: 'bg-yellow-600 hover:bg-yellow-500 text-white',
      shadow: 'shadow-yellow-500/20'
    },
    danger: {
      border: 'border-orange-500/30',
      bg: 'from-orange-950/50 to-red-950/50',
      icon: 'text-orange-400',
      button: 'bg-orange-600 hover:bg-orange-500 text-white',
      shadow: 'shadow-orange-500/20'
    },
    critical: {
      border: 'border-red-500/30',
      bg: 'from-red-950/50 to-rose-950/50',
      icon: 'text-red-400',
      button: 'bg-red-600 hover:bg-red-500 text-white',
      shadow: 'shadow-red-500/20'
    }
  }

  const colors = colorScheme[warningLevel]

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300",
        isAnimating ? "bg-black/60 backdrop-blur-sm" : "bg-black/0 backdrop-blur-none"
      )}
      onClick={handleCancel}
    >
      <Card
        className={cn(
          "relative max-w-lg w-full overflow-hidden transition-all duration-300 transform",
          "bg-gradient-to-br from-slate-900 to-slate-800",
          `border-2 ${colors.border} shadow-2xl ${colors.shadow}`,
          isAnimating
            ? "scale-100 opacity-100 translate-y-0"
            : "scale-95 opacity-0 translate-y-4"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={cn(
          "relative bg-gradient-to-r border-b-2 p-5",
          colors.bg,
          colors.border
        )}>
          <Button
            variant="ghost"
            size="icon"
            className={cn("absolute top-3 right-3 hover:bg-white/10", colors.icon)}
            onClick={handleCancel}
          >
            <X className="h-5 w-5" />
          </Button>

          <div className="flex items-start gap-3">
            <div className="relative mt-1">
              <div className={cn(
                "absolute inset-0 rounded-full animate-ping opacity-75",
                warningLevel === 'critical' ? 'bg-red-500' :
                warningLevel === 'danger' ? 'bg-orange-500' :
                'bg-yellow-500'
              )} />
              <AlertTriangle className={cn("relative h-6 w-6", colors.icon)} />
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-white mb-1">
                {title}
              </h3>
              <p className="text-sm text-gray-300 leading-relaxed">
                {message}
              </p>
            </div>
          </div>
        </div>

        {/* Command preview */}
        {command && (
          <div className="px-5 py-4 bg-black/30 border-b border-white/10">
            <div className="text-xs text-gray-400 mb-2 font-semibold">
              COMMAND TO EXECUTE:
            </div>
            <code className="block px-3 py-2 bg-black/50 border border-white/10 rounded text-sm font-mono text-yellow-300">
              $ {command}
            </code>
          </div>
        )}

        {/* Content */}
        <div className="p-5">
          <div className="flex items-start gap-3 p-4 bg-white/5 border border-white/10 rounded-lg">
            <div className={cn("text-sm", colors.icon)}>⚠️</div>
            <div className="text-sm text-gray-300 leading-relaxed">
              {warningLevel === 'critical' && (
                <p className="font-semibold text-red-300 mb-2">
                  This action is irreversible and may result in permanent data loss.
                </p>
              )}
              {warningLevel === 'danger' && (
                <p className="font-semibold text-orange-300 mb-2">
                  This action cannot be undone easily.
                </p>
              )}
              <p>
                Are you sure you want to proceed? This operation may affect mission progress
                and system files.
              </p>
            </div>
          </div>

          {/* Safer Alternative Suggestion */}
          {saferAlternative && (
            <div className="mt-4 p-4 bg-blue-950/30 border border-blue-500/30 rounded-lg">
              <div className="flex items-start gap-2">
                <div className="text-blue-400 text-sm">💡</div>
                <div>
                  <p className="text-sm font-semibold text-blue-300 mb-1">
                    Consider a safer alternative:
                  </p>
                  <code className="block px-3 py-2 bg-black/50 border border-blue-500/20 rounded text-sm font-mono text-blue-200">
                    $ {saferAlternative}
                  </code>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-gray-500 font-mono">
              Press Esc to cancel • Ctrl+Enter to confirm
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                {cancelLabel}
              </Button>
              <Button
                onClick={handleConfirm}
                className={cn("font-semibold shadow-lg", colors.button, colors.shadow)}
              >
                {confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
