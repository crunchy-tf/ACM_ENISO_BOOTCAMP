"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Terminal, Clock, Cpu, Zap } from "lucide-react"
import { motion } from "framer-motion"

interface AdventureChoice {
  id: "hack_mainframe" | "time_traveler"
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
  {
    id: "time_traveler",
    title: "Time Traveler's Terminal",
    description: "Restore corrupted timelines and preserve historical records",
    icon: <Clock className="w-12 h-12" />,
    theme: "from-cyan-600 to-blue-700",
    features: [
      "Sci-fi time archivist story",
      "Navigate temporal databases",
      "Fix timeline anomalies",
      "Learn Unix commands",
    ],
  },
]

interface AdventureSelectionProps {
  onSelect: (adventureId: "hack_mainframe" | "time_traveler") => void
}

export function AdventureSelection({ onSelect }: AdventureSelectionProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
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
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 mb-4"
          >
            <Cpu className="w-10 h-10 text-white" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600"
          >
            Choose Your Adventure
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-xl text-slate-300 max-w-2xl mx-auto"
          >
            Select your learning path and master Linux commands through an interactive story-driven
            experience
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-center gap-2 text-sm text-slate-400"
          >
            <Zap className="w-4 h-4 text-yellow-500" />
            <span>100% browser-based • No installation required • Learn by doing</span>
          </motion.div>
        </div>

        {/* Adventure Cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="grid md:grid-cols-2 gap-8"
        >
          {adventures.map((adventure, index) => (
            <motion.div
              key={adventure.id}
              initial={{ opacity: 0, x: index === 0 ? -50 : 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 + index * 0.1 }}
              onMouseEnter={() => setHoveredId(adventure.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <Card
                className={`h-full border-2 transition-all duration-300 cursor-pointer ${
                  hoveredId === adventure.id
                    ? "border-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.4)] scale-105"
                    : "border-slate-700 hover:border-slate-600"
                } bg-gradient-to-br from-slate-900/90 to-slate-950/90 backdrop-blur`}
                onClick={() => onSelect(adventure.id)}
              >
                <CardHeader className="space-y-4">
                  <div
                    className={`inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br ${adventure.theme} text-white`}
                  >
                    {adventure.icon}
                  </div>

                  <div>
                    <CardTitle className="text-2xl text-white mb-2">{adventure.title}</CardTitle>
                    <CardDescription className="text-slate-300 text-base">
                      {adventure.description}
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {adventure.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-slate-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={`w-full bg-gradient-to-r ${adventure.theme} hover:opacity-90 transition-opacity text-white font-semibold`}
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
          className="text-center space-y-2"
        >
          <p className="text-sm text-slate-500">
            You'll learn: File operations • Navigation • Text processing • Network commands • And
            more!
          </p>
          <p className="text-xs text-slate-600">
            Progress is saved automatically in your browser
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}
