/**
 * Success Animations Component
 * Celebratory animations for task/mission completion
 */

"use client"

import { useEffect, useState } from "react"
import { Check, Trophy, Sparkles, Star, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

interface SuccessAnimationProps {
  type: 'task' | 'mission' | 'adventure'
  title: string
  subtitle?: string
  isVisible: boolean
  onComplete?: () => void
}

export function SuccessAnimation({
  type,
  title,
  subtitle,
  isVisible,
  onComplete
}: SuccessAnimationProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [confetti, setConfetti] = useState<Array<{ id: number; x: number; y: number; rotation: number; delay: number; color: string }>>([])

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true)
      
      // Generate confetti
      const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: -10,
        rotation: Math.random() * 360,
        delay: Math.random() * 500,
        color: ['#fbbf24', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899'][Math.floor(Math.random() * 6)]
      }))
      setConfetti(confettiPieces)
      
      // Auto-hide after animation
      const timer = setTimeout(() => {
        setIsAnimating(false)
        setTimeout(() => {
          onComplete?.()
        }, 500)
      }, type === 'adventure' ? 5000 : type === 'mission' ? 3500 : 2500)

      return () => clearTimeout(timer)
    }
  }, [isVisible, type, onComplete])

  if (!isVisible && !isAnimating) return null

  const getIcon = () => {
    switch (type) {
      case 'adventure':
        return <Trophy className="w-24 h-24 text-yellow-400" />
      case 'mission':
        return <Star className="w-20 h-20 text-blue-400" />
      case 'task':
        return <Check className="w-16 h-16 text-green-400" />
    }
  }

  const getColorScheme = () => {
    switch (type) {
      case 'adventure':
        return {
          bg: 'from-yellow-950/90 to-orange-950/90',
          border: 'border-yellow-500/50',
          glow: 'shadow-yellow-500/50',
          text: 'text-yellow-300'
        }
      case 'mission':
        return {
          bg: 'from-blue-950/90 to-indigo-950/90',
          border: 'border-blue-500/50',
          glow: 'shadow-blue-500/50',
          text: 'text-blue-300'
        }
      case 'task':
        return {
          bg: 'from-green-950/90 to-emerald-950/90',
          border: 'border-green-500/50',
          glow: 'shadow-green-500/50',
          text: 'text-green-300'
        }
    }
  }

  const colors = getColorScheme()

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center pointer-events-none transition-all duration-500",
        isAnimating ? "opacity-100" : "opacity-0"
      )}
    >
      {/* Backdrop */}
      <div className={cn(
        "absolute inset-0 bg-black/40 backdrop-blur-sm transition-all duration-500",
        isAnimating ? "opacity-100" : "opacity-0"
      )} />

      {/* Confetti */}
      {confetti.map((piece) => (
        <div
          key={piece.id}
          className="absolute pointer-events-none"
          style={{
            left: `${piece.x}%`,
            top: `${piece.y}%`,
            animation: `confetti-fall ${2 + Math.random()}s ease-in forwards`,
            animationDelay: `${piece.delay}ms`,
          }}
        >
          <div
            className="w-3 h-3 rounded-sm opacity-80"
            style={{
              backgroundColor: piece.color,
              transform: `rotate(${piece.rotation}deg)`,
              animation: 'confetti-spin 1s linear infinite'
            }}
          />
        </div>
      ))}

      {/* Success Card */}
      <div
        className={cn(
          "relative pointer-events-auto max-w-md w-full mx-4 transform transition-all duration-700",
          isAnimating ? "scale-100 translate-y-0" : "scale-75 translate-y-8"
        )}
      >
        <div className={cn(
          "relative bg-gradient-to-br border-2 rounded-2xl overflow-hidden",
          "shadow-2xl backdrop-blur-md",
          colors.bg,
          colors.border,
          colors.glow
        )}>
          {/* Animated Background Elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          </div>

          {/* Content */}
          <div className="relative p-8">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className={cn(
                "relative animate-bounce",
                "transition-transform duration-700",
                isAnimating ? "scale-100" : "scale-0"
              )}>
                {getIcon()}
                
                {/* Glow effect */}
                <div className={cn(
                  "absolute inset-0 blur-2xl opacity-50 animate-pulse",
                  type === 'adventure' ? 'bg-yellow-500' :
                  type === 'mission' ? 'bg-blue-500' :
                  'bg-green-500'
                )} />
              </div>
            </div>

            {/* Sparkles */}
            <div className="absolute top-8 left-8 animate-ping">
              <Sparkles className="w-6 h-6 text-yellow-300 opacity-50" />
            </div>
            <div className="absolute top-12 right-12 animate-ping" style={{ animationDelay: '0.5s' }}>
              <Sparkles className="w-5 h-5 text-blue-300 opacity-50" />
            </div>
            <div className="absolute bottom-16 left-16 animate-ping" style={{ animationDelay: '1s' }}>
              <Zap className="w-5 h-5 text-purple-300 opacity-50" />
            </div>

            {/* Text Content */}
            <div className={cn(
              "text-center transition-all duration-700 delay-200",
              isAnimating ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}>
              <h2 className="text-3xl font-bold text-white mb-2">
                {type === 'adventure' && '🎊 Adventure Complete! 🎊'}
                {type === 'mission' && '✨ Mission Complete! ✨'}
                {type === 'task' && '✓ Task Complete!'}
              </h2>
              
              <div className={cn("text-xl font-semibold mb-2", colors.text)}>
                {title}
              </div>
              
              {subtitle && (
                <p className="text-sm text-gray-400">
                  {subtitle}
                </p>
              )}
            </div>

            {/* Progress Indicator */}
            {type !== 'adventure' && (
              <div className={cn(
                "mt-6 h-1 bg-white/10 rounded-full overflow-hidden transition-all duration-1000 delay-500",
                isAnimating ? "opacity-100" : "opacity-0"
              )}>
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-1000 delay-700",
                    type === 'mission' ? 'bg-blue-500' : 'bg-green-500'
                  )}
                  style={{
                    width: isAnimating ? '100%' : '0%'
                  }}
                />
              </div>
            )}

            {/* XP/Points Animation */}
            {type !== 'task' && (
              <div className={cn(
                "mt-4 text-center transition-all duration-700 delay-1000",
                isAnimating ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              )}>
                <div className="inline-block px-4 py-2 bg-white/10 rounded-full border border-white/20">
                  <span className="text-yellow-300 font-bold text-sm">
                    {type === 'adventure' ? '+500 XP' : '+100 XP'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotateZ(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotateZ(720deg);
            opacity: 0;
          }
        }

        @keyframes confetti-spin {
          0% {
            transform: rotateZ(0deg);
          }
          100% {
            transform: rotateZ(360deg);
          }
        }
      `}</style>
    </div>
  )
}
