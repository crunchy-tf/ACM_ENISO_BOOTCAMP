/**
 * SSH Modal Component
 * Visual indicator for active SSH sessions
 */

"use client"

import { Terminal, Wifi, WifiOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface SSHModalProps {
  isConnected: boolean
  host?: string
  user?: string
  sessionDuration?: number
  onDisconnect?: () => void
}

export function SSHModal({
  isConnected,
  host = "",
  user = "",
  sessionDuration = 0,
  onDisconnect
}: SSHModalProps) {
  if (!isConnected) return null

  // Format duration
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins === 0) return `${secs}s`
    return `${mins}m ${secs}s`
  }

  return (
    <div className="fixed top-4 right-4 z-40 animate-in slide-in-from-right-5 duration-300">
      <div className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg border-2 shadow-lg backdrop-blur-sm",
        "bg-gradient-to-r from-purple-950/90 to-blue-950/90 border-purple-500/30"
      )}>
        {/* Connection indicator */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-purple-500 animate-ping opacity-75" />
          <Wifi className="relative h-5 w-5 text-purple-400" />
        </div>

        {/* Session info */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-purple-300" />
            <span className="text-sm font-mono text-white font-semibold">
              {user}@{host}
            </span>
            <Badge 
              variant="outline" 
              className="px-2 py-0 h-5 text-xs border-purple-500/30 text-purple-300"
            >
              SSH
            </Badge>
          </div>
          
          <div className="text-xs text-purple-300/70 font-mono">
            Connected {formatDuration(sessionDuration)}
          </div>
        </div>

        {/* Disconnect button */}
        {onDisconnect && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDisconnect}
            className="h-8 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 ml-2"
          >
            <WifiOff className="h-4 w-4 mr-1" />
            Disconnect
          </Button>
        )}
      </div>

      {/* Hint text */}
      <div className="mt-2 text-xs text-purple-300/50 text-right font-mono">
        Type 'exit' to close connection
      </div>
    </div>
  )
}
