"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Terminal, Cpu, Zap } from "lucide-react"
import { motion } from "framer-motion"

interface AdventureChoice {
  id: "hack_mainframe"
  title: string
  description: string
  icon: React.ReactNode
  theme: string
  features: string[]
}

const adventures: AdventureChoice[] = [
  {
    id: "hack_mainframe",
    title: "Hack the Mainframe",
    description: "Infiltrate a corrupt corporation's system and expose their secrets",
    icon: <Terminal className="w-12 h-12" />,
    theme: "from-green-600 to-emerald-700",
    features: [
      "Cyberpunk hacker storyline",
      "Navigate corporate filesystems",
      "Uncover classified documents",
      "Master Linux commands",
    ],
  },
]

interface AdventureSelectionProps {
  onSelect: (adventureId: "hack_mainframe") => void
}

export function AdventureSelection({ onSelect }: AdventureSelectionProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-4 z-[100]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-6xl space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 mb-4 shadow-lg shadow-cyan-500/40"
          >
            <Cpu className="w-12 h-12 text-white" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-5xl sm:text-6xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-400"
          >
            Hack the Mainframe
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-xl sm:text-2xl text-slate-100 max-w-2xl mx-auto font-medium"
          >
            Infiltrate a corrupt corporation's system and master Linux commands through an interactive cyberpunk hacker experience
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-center gap-3 text-base text-cyan-200"
          >
            <Zap className="w-5 h-5 text-yellow-400" />
            <span className="font-semibold">100% browser-based • No installation required • Learn by doing</span>
          </motion.div>
        </div>

        {/* Adventure Card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex justify-center"
        >
          {adventures.map((adventure, index) => (
            <motion.div
              key={adventure.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 }}
              onMouseEnter={() => setHoveredId(adventure.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="w-full max-w-md"
            >
              <Card
                className={`h-full border-2 transition-all duration-300 cursor-pointer ${
                  hoveredId === adventure.id
                    ? "border-cyan-400 shadow-[0_0_40px_rgba(6,182,212,0.5)] scale-105"
                    : "border-slate-600 hover:border-slate-500"
                } bg-gradient-to-br from-slate-900/95 to-slate-950/95 backdrop-blur-md`}
                onClick={() => onSelect(adventure.id)}
              >
                <CardHeader className="space-y-4">
                  <div
                    className={`inline-flex items-center justify-center w-20 h-20 rounded-xl bg-gradient-to-br ${adventure.theme} text-white shadow-lg`}
                  >
                    {adventure.icon}
                  </div>

                  <div>
                    <CardTitle className="text-3xl text-white mb-2 font-bold">{adventure.title}</CardTitle>
                    <CardDescription className="text-slate-100 text-lg font-medium">
                      {adventure.description}
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {adventure.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-3 text-base text-slate-200 font-medium">
                        <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={`w-full bg-gradient-to-r ${adventure.theme} hover:opacity-90 transition-all text-white font-bold text-lg py-7 shadow-xl shadow-green-500/30`}
                    size="lg"
                  >
                    Start Mission
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Info Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center space-y-3"
        >
          <p className="text-base text-slate-200 font-medium">
            You'll learn: File operations • Navigation • Text processing • Network commands • And
            more!
          </p>
          <p className="text-sm text-slate-300">
            Progress is saved automatically in your browser
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}
