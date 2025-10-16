/**
 * Typewriter Effect Hook
 * Provides smooth typewriter animation for text reveal
 */

"use client"

import { useState, useEffect } from "react"

export interface TypewriterOptions {
  text: string
  speed?: number // milliseconds per character
  delay?: number // initial delay before starting
  onComplete?: () => void
}

export function useTypewriter({
  text,
  speed = 30,
  delay = 0,
  onComplete
}: TypewriterOptions) {
  const [displayedText, setDisplayedText] = useState("")
  const [isComplete, setIsComplete] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (delay > 0) {
      const delayTimeout = setTimeout(() => {
        setCurrentIndex(1)
      }, delay)
      return () => clearTimeout(delayTimeout)
    } else {
      setCurrentIndex(1)
    }
  }, [delay])

  useEffect(() => {
    if (currentIndex === 0) return

    if (currentIndex <= text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(text.slice(0, currentIndex))
        setCurrentIndex(currentIndex + 1)
      }, speed)

      return () => clearTimeout(timeout)
    } else if (!isComplete) {
      setIsComplete(true)
      onComplete?.()
    }
  }, [currentIndex, text, speed, isComplete, onComplete])

  const skip = () => {
    setDisplayedText(text)
    setCurrentIndex(text.length + 1)
    setIsComplete(true)
    onComplete?.()
  }

  return { displayedText, isComplete, skip }
}
