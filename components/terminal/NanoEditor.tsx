"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Save, X } from "lucide-react"

interface NanoEditorProps {
  isOpen: boolean
  onClose: () => void
  filename: string
  initialContent: string
  onSave: (content: string) => void
}

export function NanoEditor({ isOpen, onClose, filename, initialContent, onSave }: NanoEditorProps) {
  const [content, setContent] = useState(initialContent)
  const [isSaved, setIsSaved] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setContent(initialContent)
    setIsSaved(false)
  }, [initialContent, isOpen])

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isOpen])

  const handleSave = () => {
    onSave(content)
    setIsSaved(true)
    setTimeout(() => {
      onClose()
    }, 300)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+O or Cmd+O to save
    if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
      e.preventDefault()
      handleSave()
    }
    // Ctrl+X or Cmd+X to exit (but not cut)
    if ((e.ctrlKey || e.metaKey) && e.key === 'x' && !e.shiftKey) {
      if (content !== initialContent) {
        if (confirm('Save modified buffer?')) {
          handleSave()
        } else {
          onClose()
        }
      } else {
        onClose()
      }
      e.preventDefault()
    }
    // Tab key - insert 4 spaces
    if (e.key === 'Tab') {
      e.preventDefault()
      const target = e.currentTarget
      const start = target.selectionStart
      const end = target.selectionEnd
      const newContent = content.substring(0, start) + '    ' + content.substring(end)
      setContent(newContent)
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 4
        }
      }, 0)
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="w-full max-w-4xl h-[80vh] flex flex-col bg-[#1a1a2e] border-2 border-green-500/30 rounded-lg shadow-2xl">
        {/* Header */}
        <div className="bg-[#0a0e27] px-4 py-3 border-b border-green-500/30 flex items-center justify-between">
          <div className="text-green-500 font-mono text-sm flex items-center gap-2">
            <span className="text-green-400">GNU nano 2.9.3</span>
            <span className="text-gray-400">File:</span>
            <span className="text-cyan-400">{filename}</span>
            {isSaved && (
              <span className="text-green-400 text-xs animate-pulse">[ Saved ]</span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-white hover:bg-red-500/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Editor area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 relative overflow-hidden">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => {
                setContent(e.target.value)
                setIsSaved(false)
              }}
              onKeyDown={handleKeyDown}
              className="w-full h-full p-4 bg-[#0a0e27] text-green-400 font-mono text-sm resize-none focus:outline-none"
              style={{
                lineHeight: '1.5',
                letterSpacing: '0.5px',
              }}
              spellCheck={false}
            />
          </div>

          {/* Status bar */}
          <div className="bg-[#0a0e27] border-t border-green-500/30 px-4 py-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="text-gray-400">
                Lines: {content.split('\n').length} | Chars: {content.length}
              </div>
              <div className="text-gray-400">
                {content !== initialContent && <span className="text-yellow-400">Modified</span>}
              </div>
            </div>
          </div>

          {/* Command bar (nano-style) */}
          <div className="bg-[#16213e] px-4 py-2 space-y-1 border-t border-green-500/20">
            <div className="flex items-center gap-6 text-xs font-mono">
              <button
                onClick={handleSave}
                className="text-white hover:text-green-400 transition-colors"
              >
                <span className="text-green-400">^O</span> <span className="text-gray-300">Save</span>
              </button>
              <button
                onClick={() => {
                  if (content !== initialContent) {
                    if (confirm('Save modified buffer?')) {
                      handleSave()
                    } else {
                      onClose()
                    }
                  } else {
                    onClose()
                  }
                }}
                className="text-white hover:text-green-400 transition-colors"
              >
                <span className="text-green-400">^X</span> <span className="text-gray-300">Exit</span>
              </button>
              <div className="text-gray-500">
                <span className="text-green-400">^W</span> <span className="text-gray-400">Search</span>
              </div>
              <div className="text-gray-500">
                <span className="text-green-400">^K</span> <span className="text-gray-400">Cut</span>
              </div>
              <div className="text-gray-500">
                <span className="text-green-400">^U</span> <span className="text-gray-400">Paste</span>
              </div>
            </div>
            <div className="text-[10px] text-gray-500 font-mono">
              Note: Use Ctrl+O (or Cmd+O) to save, Ctrl+X (or Cmd+X) to exit
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="absolute top-3 right-14 flex gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            className="bg-green-600 hover:bg-green-700 text-white h-7 px-3"
          >
            <Save className="h-3 w-3 mr-1" />
            Save
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (content !== initialContent) {
                if (confirm('Discard changes?')) {
                  onClose()
                }
              } else {
                onClose()
              }
            }}
            className="border-red-500/50 text-red-400 hover:bg-red-500/10 h-7 px-3"
          >
            <X className="h-3 w-3 mr-1" />
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
