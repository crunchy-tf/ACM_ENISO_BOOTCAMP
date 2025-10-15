"use client"

import { useEffect, useState } from "react"
import {
  ChevronDown,
  Code2,
  Rocket,
  Sparkles,
  Globe,
  Terminal,
  Layout,
  Layers,
  Server,
  Upload,
  Network,
  Box,
  MapPin,
  Search,
  Wifi,
  Monitor,
  Lightbulb,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import dynamic from "next/dynamic"

// Dynamically import the terminal exercise to avoid SSR issues
const TerminalExercise = dynamic(
  () => import("@/components/terminal/TerminalExercise").then((mod) => ({ default: mod.TerminalExercise })),
  { ssr: false }
)

export default function PresentationPage() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  const slides = [
    { id: "welcome", component: <WelcomeSlide /> },
    { id: "theme", component: <ThemeSlide /> },
    { id: "journey", component: <JourneySlide /> },
    { id: "question-internet", component: <QuestionSlide question="What is the Internet?" icon={Globe} /> },
    { id: "answer-internet", component: <InternetAnswerSlide /> },
    { id: "question-network", component: <QuestionSlide question="What is a Network?" icon={Network} /> },
    { id: "answer-network", component: <NetworkAnswerSlide /> },
    {
      id: "question-packets",
      component: <QuestionSlide question="What are Packets and How Are They Transferred?" icon={Box} />,
    },
    { id: "answer-packets", component: <PacketsAnswerSlide /> },
    {
      id: "question-ip",
      component: (
        <QuestionSlide question="What are IP Addresses (Internal & External, Private & Public)?" icon={MapPin} />
      ),
    },
    { id: "answer-ip", component: <IPAddressAnswerSlide /> },
    {
      id: "question-dns",
      component: <QuestionSlide question="What is DNS and What are DNS Servers?" icon={Search} />,
    },
    { id: "answer-dns", component: <DNSAnswerSlide /> },
    {
      id: "question-isp",
      component: <QuestionSlide question="What is an ISP (Internet Service Provider)?" icon={Wifi} />,
    },
    { id: "answer-isp", component: <ISPAnswerSlide /> },
    {
      id: "question-web",
      component: <QuestionSlide question="What is a Web Server, Web Browser (Client), and Web Page?" icon={Monitor} />,
    },
    { id: "answer-web", component: <WebServerAnswerSlide /> },
    { id: "exercise-google-search", component: <ExerciseSlide /> },
    { id: "answer-google-1", component: <GoogleSearchPhase1Slide /> },
    { id: "answer-google-2", component: <GoogleSearchPhase2Slide /> },
    { id: "answer-google-3", component: <GoogleSearchPhase3Slide /> },
    { id: "answer-google-4", component: <GoogleSearchPhase4Slide /> },
    { id: "answer-google-5", component: <GoogleSearchPhase5Slide /> },
    { id: "answer-google-6", component: <GoogleSearchPhase6Slide /> },
    {
      id: "question-process-thread",
      component: (
        <QuestionSlide question="What is a process and what is a thread, and what is the difference?" icon={Terminal} />
      ),
    },
    { id: "answer-process-thread", component: <ProcessThreadAnswerSlide /> },
    {
      id: "question-concurrency",
      component: (
        <QuestionSlide
          question="How does the computer manage concurrency, parallelism, multithreading, multiprocessing?"
          icon={Layers}
        />
      ),
    },
    { id: "answer-concurrency", component: <ConcurrencyAnswerSlide /> },
    {
      id: "question-paths",
      component: <QuestionSlide question="What is the difference between absolute vs relative paths?" icon={Code2} />,
    },
    { id: "answer-paths", component: <PathsAnswerSlide /> },
    { id: "terminal-exercise", component: <TerminalExercise /> },
  ]

  useEffect(() => {
    const handleScroll = (e: WheelEvent) => {
      if (e.deltaY > 0 && currentSlide < slides.length - 1) {
        setIsVisible(false)
        setTimeout(() => {
          setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1))
          setIsVisible(true)
        }, 300)
      } else if (e.deltaY < 0 && currentSlide > 0) {
        setIsVisible(false)
        setTimeout(() => {
          setCurrentSlide((prev) => Math.max(prev - 1, 0))
          setIsVisible(true)
        }, 300)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        setIsVisible(false)
        setTimeout(() => {
          setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1))
          setIsVisible(true)
        }, 300)
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        setIsVisible(false)
        setTimeout(() => {
          setCurrentSlide((prev) => Math.max(prev - 1, 0))
          setIsVisible(true)
        }, 300)
      }
    }

    window.addEventListener("wheel", handleScroll, { passive: true })
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("wheel", handleScroll)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [currentSlide, slides.length])

  return (
    <div className="relative h-screen w-full overflow-hidden bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Slide Navigation Dots */}
      <div className="fixed right-4 top-1/2 z-50 flex -translate-y-1/2 flex-col gap-3 md:right-8">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setIsVisible(false)
              setTimeout(() => {
                setCurrentSlide(index)
                setIsVisible(true)
              }, 300)
            }}
            className={`h-3 w-3 rounded-full transition-all duration-300 ${
              currentSlide === index ? "bg-primary scale-125" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Slide Counter */}
      <div className="fixed left-4 top-4 z-50 font-mono text-sm text-muted-foreground md:left-8 md:top-8">
        {String(currentSlide + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
      </div>

      {/* Current Slide */}
      <div className={`h-full w-full transition-opacity duration-300 ${isVisible ? "opacity-100" : "opacity-0"}`}>
        {slides[currentSlide].component}
      </div>

      {/* Scroll Indicator */}
      {currentSlide < slides.length - 1 && (
        <div className="fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2 animate-bounce">
          <span className="text-xs text-muted-foreground">Scroll or use arrow keys</span>
          <ChevronDown className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
    </div>
  )
}

function WelcomeSlide() {
  return (
    <div className="relative flex h-full w-full items-center justify-center px-4 md:px-8 overflow-hidden">
      <div className="relative max-w-6xl text-center w-full">
        <div className="absolute left-[10%] top-[20%] h-24 w-24 md:h-32 md:w-32 rounded-full bg-primary/10 blur-3xl animate-float" />
        <div
          className="absolute right-[15%] top-[30%] h-28 w-28 md:h-40 md:w-40 rounded-full bg-secondary/10 blur-3xl animate-float"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute bottom-[25%] left-[20%] h-24 w-24 md:h-36 md:w-36 rounded-full bg-accent/20 blur-3xl animate-float"
          style={{ animationDelay: "2s" }}
        />

        <div className="relative z-10 space-y-6 md:space-y-8">
          <div className="animate-slide-in-up space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-xs md:text-sm font-medium text-primary md:px-6">
              <Sparkles className="h-4 w-4" />
              Welcome to
            </div>
            <h1 className="font-sans text-5xl font-black tracking-tight text-foreground md:text-7xl lg:text-8xl xl:text-9xl text-balance px-4">
              ACM ENISO'S
              <br />
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                TECHBOOTCAMP
              </span>
            </h1>
          </div>

          <p
            className="animate-slide-in-up mx-auto max-w-2xl text-lg md:text-xl lg:text-2xl text-muted-foreground text-balance px-4"
            style={{ animationDelay: "0.2s" }}
          >
            An immersive journey into the world of software engineering
          </p>

          <div
            className="animate-slide-in-up flex flex-wrap items-center justify-center gap-3 md:gap-4 px-4"
            style={{ animationDelay: "0.4s" }}
          >
            <div className="flex items-center gap-2 rounded-lg bg-card px-3 py-2 md:px-4 shadow-lg">
              <Code2 className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              <span className="font-mono text-xs md:text-sm font-medium">Learn</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-card px-3 py-2 md:px-4 shadow-lg">
              <Rocket className="h-4 w-4 md:h-5 md:w-5 text-secondary" />
              <span className="font-mono text-xs md:text-sm font-medium">Build</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-card px-3 py-2 md:px-4 shadow-lg">
              <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-accent-foreground" />
              <span className="font-mono text-xs md:text-sm font-medium">Deploy</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ThemeSlide() {
  return (
    <div className="flex h-full w-full items-center justify-center px-4 md:px-8 py-8 overflow-hidden">
      <div className="max-w-6xl w-full">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 xl:gap-16 items-center">
          {/* Left side - Theme title */}
          <div className="space-y-4 md:space-y-6 animate-slide-in-up">
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary/10 px-4 py-2 text-xs md:text-sm font-medium text-secondary md:px-6">
              <Code2 className="h-4 w-4" />
              Our Theme
            </div>
            <h2 className="font-sans text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black tracking-tight text-foreground text-balance">
              FROM{" "}
              <span className="relative">
                <span className="text-muted-foreground/30">NO-STACK</span>
                <span className="absolute inset-0 blur-sm text-muted-foreground/30">NO-STACK</span>
              </span>
              <br />
              TO{" "}
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                FULL-STACK
              </span>
            </h2>
          </div>

          {/* Right side - Description */}
          <div className="space-y-4 md:space-y-6 animate-slide-in-up" style={{ animationDelay: "0.2s" }}>
            <div className="space-y-4 rounded-2xl bg-card p-6 md:p-8 shadow-2xl border border-border">
              <div className="flex items-start gap-3 md:gap-4">
                <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                  <span className="text-xl md:text-2xl font-black text-primary">0</span>
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-foreground">Start from Zero</h3>
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                    No prior experience? No problem. We'll guide you from the very beginning.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 md:gap-4">
                <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-lg bg-secondary/10 flex-shrink-0">
                  <span className="text-xl md:text-2xl font-black text-secondary">→</span>
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-foreground">Build Your Skills</h3>
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                    Master frontend, backend, databases, and everything in between.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 md:gap-4">
                <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-lg bg-accent/20 flex-shrink-0">
                  <Rocket className="h-5 w-5 md:h-6 md:w-6 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-foreground">Launch Your Career</h3>
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                    Graduate as a confident full-stack developer ready to build anything.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function JourneySlide() {
  const technologies = [
    { name: "How the Web Works", color: "bg-primary", icon: Globe },
    { name: "CS Tools (Linux & Git)", color: "bg-secondary", icon: Terminal },
    { name: "HTML + CSS + JS", color: "bg-accent", icon: Layout },
    { name: "React", color: "bg-primary", icon: Layers },
    { name: "Node.js + Express + MongoDB", color: "bg-secondary", icon: Server },
    { name: "Deployment", color: "bg-accent", icon: Upload },
  ]

  return (
    <div className="flex h-full w-full items-center justify-center px-4 md:px-8 py-8 overflow-hidden">
      <div className="max-w-6xl text-center w-full">
        <div className="space-y-8 md:space-y-12">
          <div className="animate-slide-in-up space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/20 px-4 py-2 text-xs md:text-sm font-medium text-accent-foreground md:px-6">
              <Sparkles className="h-4 w-4" />
              Your Learning Path
            </div>
            <h2 className="font-sans text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black tracking-tight text-foreground text-balance px-4">
              The Journey Ahead
            </h2>
            <p className="mx-auto max-w-2xl text-base md:text-lg lg:text-xl text-muted-foreground leading-relaxed text-balance px-4">
              Transform from a complete beginner to a full-stack developer through hands-on projects and expert guidance
            </p>
          </div>

          {/* Technology Grid */}
          <div
            className="animate-slide-in-up grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:gap-6"
            style={{ animationDelay: "0.2s" }}
          >
            {technologies.map((tech, index) => {
              const IconComponent = tech.icon
              return (
                <div
                  key={tech.name}
                  className="group relative overflow-hidden rounded-xl md:rounded-2xl bg-card p-4 md:p-6 shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl border border-border"
                  style={{ animationDelay: `${0.3 + index * 0.1}s` }}
                >
                  <div
                    className={`absolute inset-0 ${tech.color} opacity-0 transition-opacity duration-300 group-hover:opacity-10`}
                  />
                  <div className="relative space-y-2 md:space-y-3">
                    <IconComponent className="h-8 w-8 md:h-10 md:w-10 text-foreground" />
                    <h3 className="font-bold text-sm md:text-base text-foreground text-balance leading-tight">
                      {tech.name}
                    </h3>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="animate-slide-in-up" style={{ animationDelay: "0.8s" }}>
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-base md:text-lg px-6 py-5 md:px-8 md:py-6 rounded-xl shadow-lg"
            >
              Let's Get Started
              <Rocket className="ml-2 h-4 w-4 md:h-5 md:w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function QuestionSlide({ question, icon: Icon }: { question: string; icon: any }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center px-4 md:px-8 overflow-hidden">
      <div className="relative max-w-5xl text-center w-full">
        <div className="absolute left-[15%] top-[25%] h-24 w-24 md:h-32 md:w-32 rounded-full bg-primary/10 blur-3xl animate-float" />
        <div
          className="absolute right-[20%] bottom-[30%] h-28 w-28 md:h-40 md:w-40 rounded-full bg-secondary/10 blur-3xl animate-float"
          style={{ animationDelay: "1.5s" }}
        />

        <div className="relative z-10 space-y-6 md:space-y-8 animate-slide-in-up px-4">
          <div className="inline-flex items-center justify-center rounded-full bg-primary/10 p-4 md:p-6">
            <Icon className="h-12 w-12 md:h-16 md:w-16 text-primary" />
          </div>
          <h2 className="font-sans text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl font-black tracking-tight text-foreground text-balance">
            {question}
          </h2>
        </div>
      </div>
    </div>
  )
}

function InternetAnswerSlide() {
  return (
    <div className="flex h-full w-full items-center justify-center px-4 md:px-8 py-8 overflow-hidden">
      <div className="max-w-5xl w-full">
        <div className="space-y-6 md:space-y-8 animate-slide-in-up">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-xs md:text-sm font-medium text-primary md:px-6">
            <Globe className="h-4 w-4" />
            The Internet
          </div>

          <div className="space-y-4 md:space-y-6 rounded-2xl bg-card p-6 md:p-10 shadow-2xl border border-border">
            <h3 className="font-sans text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-foreground text-balance">
              The Internet is a global system of interconnected computer networks
            </h3>
            <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground leading-relaxed text-balance">
              that communicate using standard protocols
            </p>

            <div className="grid gap-3 md:gap-4 pt-4 md:pt-6 sm:grid-cols-3">
              <div className="space-y-2 rounded-xl bg-primary/5 p-4 md:p-6 border border-primary/20">
                <div className="text-2xl md:text-3xl font-black text-primary break-words">Global</div>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                  Connects billions of devices worldwide
                </p>
              </div>
              <div className="space-y-2 rounded-xl bg-secondary/5 p-4 md:p-6 border border-secondary/20">
                <div className="text-xl md:text-2xl lg:text-3xl font-black text-secondary break-words hyphens-auto">
                  Interconnected
                </div>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                  Networks linked together seamlessly
                </p>
              </div>
              <div className="space-y-2 rounded-xl bg-accent/10 p-4 md:p-6 border border-accent/20">
                <div className="text-2xl md:text-3xl font-black text-accent-foreground break-words">Protocols</div>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                  Standard rules for communication
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function NetworkAnswerSlide() {
  return (
    <div className="flex h-full w-full items-center justify-center px-4 md:px-8 py-8 overflow-hidden">
      <div className="max-w-6xl w-full">
        <div className="space-y-6 md:space-y-8 animate-slide-in-up">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary/10 px-4 py-2 text-xs md:text-sm font-medium text-secondary md:px-6">
            <Network className="h-4 w-4" />
            Networks
          </div>

          <div className="grid gap-6 md:gap-8 lg:grid-cols-2 items-center">
            {/* Left side - Explanation */}
            <div className="space-y-4 md:space-y-6 rounded-2xl bg-card p-6 md:p-8 shadow-2xl border border-border">
              <h3 className="font-sans text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-foreground text-balance">
                A network is a group of connected devices
              </h3>
              <p className="text-base md:text-lg lg:text-xl text-muted-foreground leading-relaxed text-balance">
                that can share data and resources
              </p>

              <div className="space-y-3 pt-4">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                    <span className="text-sm font-bold text-primary">1</span>
                  </div>
                  <div>
                    <p className="text-sm md:text-base font-semibold text-foreground">Connected</p>
                    <p className="text-xs md:text-sm text-muted-foreground">Devices link together</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/5 border border-secondary/20">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10 flex-shrink-0">
                    <span className="text-sm font-bold text-secondary">2</span>
                  </div>
                  <div>
                    <p className="text-sm md:text-base font-semibold text-foreground">Share Data</p>
                    <p className="text-xs md:text-sm text-muted-foreground">Exchange information</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/10 border border-accent/20">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20 flex-shrink-0">
                    <span className="text-sm font-bold text-accent-foreground">3</span>
                  </div>
                  <div>
                    <p className="text-sm md:text-base font-semibold text-foreground">Share Resources</p>
                    <p className="text-xs md:text-sm text-muted-foreground">Access shared files & printers</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side - Network Animation */}
            <div className="rounded-2xl bg-card p-6 md:p-8 shadow-2xl border border-border">
              <div className="relative h-[400px] md:h-[450px] flex items-center justify-center">
                {/* Central Router/Hub */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                  <div className="relative">
                    <div className="flex h-20 w-20 md:h-24 md:w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-2xl animate-pulse-slow">
                      <Network className="h-10 w-10 md:h-12 md:w-12 text-primary-foreground" />
                    </div>
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                      <span className="text-xs font-semibold text-primary">Router</span>
                    </div>
                  </div>
                </div>

                {/* Device 1 - Laptop (Top) */}
                <div
                  className="absolute left-1/2 top-[5%] -translate-x-1/2 animate-network-connect"
                  style={{ animationDelay: "0.3s" }}
                >
                  <div className="relative">
                    <div className="flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-xl bg-secondary shadow-lg">
                      <Layout className="h-7 w-7 md:h-8 md:w-8 text-secondary-foreground" />
                    </div>
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                      <span className="text-xs font-medium text-muted-foreground">Laptop</span>
                    </div>
                    {/* Connection line to center */}
                    <div
                      className="absolute left-1/2 top-full h-[80px] md:h-[100px] w-0.5 bg-gradient-to-b from-secondary to-transparent animate-line-draw origin-top"
                      style={{ animationDelay: "0.3s" }}
                    />
                    {/* Data pulse */}
                    <div
                      className="absolute left-1/2 top-full -translate-x-1/2 animate-data-pulse"
                      style={{ animationDelay: "1.5s" }}
                    >
                      <div className="h-2 w-2 rounded-full bg-secondary shadow-lg" />
                    </div>
                  </div>
                </div>

                {/* Device 2 - Phone (Right) */}
                <div
                  className="absolute right-[8%] top-1/2 -translate-y-1/2 animate-network-connect"
                  style={{ animationDelay: "0.6s" }}
                >
                  <div className="relative">
                    <div className="flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-xl bg-accent/80 shadow-lg">
                      <Globe className="h-7 w-7 md:h-8 md:w-8 text-accent-foreground" />
                    </div>
                    <div className="absolute -right-12 top-1/2 -translate-y-1/2 whitespace-nowrap">
                      <span className="text-xs font-medium text-muted-foreground">Phone</span>
                    </div>
                    {/* Connection line to center */}
                    <div
                      className="absolute right-full top-1/2 w-[60px] md:w-[80px] h-0.5 bg-gradient-to-l from-accent/80 to-transparent animate-line-draw origin-right"
                      style={{ animationDelay: "0.6s" }}
                    />
                    {/* Data pulse */}
                    <div
                      className="absolute right-full top-1/2 -translate-y-1/2 animate-data-pulse-horizontal"
                      style={{ animationDelay: "1.8s" }}
                    >
                      <div className="h-2 w-2 rounded-full bg-accent shadow-lg" />
                    </div>
                  </div>
                </div>

                {/* Device 3 - Tablet (Bottom Right) */}
                <div
                  className="absolute right-[20%] bottom-[8%] animate-network-connect"
                  style={{ animationDelay: "0.9s" }}
                >
                  <div className="relative">
                    <div className="flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-xl bg-primary/70 shadow-lg">
                      <Layers className="h-7 w-7 md:h-8 md:w-8 text-primary-foreground" />
                    </div>
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                      <span className="text-xs font-medium text-muted-foreground">Tablet</span>
                    </div>
                    {/* Connection line to center */}
                    <div
                      className="absolute left-1/2 bottom-full h-[70px] md:h-[90px] w-0.5 bg-gradient-to-t from-primary/70 to-transparent animate-line-draw origin-bottom"
                      style={{ animationDelay: "0.9s" }}
                    />
                    {/* Data pulse */}
                    <div
                      className="absolute left-1/2 bottom-full -translate-x-1/2 animate-data-pulse-up"
                      style={{ animationDelay: "2.1s" }}
                    >
                      <div className="h-2 w-2 rounded-full bg-primary shadow-lg" />
                    </div>
                  </div>
                </div>

                {/* Device 4 - Desktop (Bottom Left) */}
                <div
                  className="absolute left-[20%] bottom-[8%] animate-network-connect"
                  style={{ animationDelay: "1.2s" }}
                >
                  <div className="relative">
                    <div className="flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-xl bg-secondary/80 shadow-lg">
                      <Terminal className="h-7 w-7 md:h-8 md:w-8 text-secondary-foreground" />
                    </div>
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                      <span className="text-xs font-medium text-muted-foreground">Desktop</span>
                    </div>
                    {/* Connection line to center */}
                    <div
                      className="absolute left-1/2 bottom-full h-[70px] md:h-[90px] w-0.5 bg-gradient-to-t from-secondary/80 to-transparent animate-line-draw origin-bottom"
                      style={{ animationDelay: "1.2s" }}
                    />
                    {/* Data pulse */}
                    <div
                      className="absolute left-1/2 bottom-full -translate-x-1/2 animate-data-pulse-up"
                      style={{ animationDelay: "2.4s" }}
                    >
                      <div className="h-2 w-2 rounded-full bg-secondary shadow-lg" />
                    </div>
                  </div>
                </div>

                {/* Device 5 - Server (Left) */}
                <div
                  className="absolute left-[8%] top-1/2 -translate-y-1/2 animate-network-connect"
                  style={{ animationDelay: "1.5s" }}
                >
                  <div className="relative">
                    <div className="flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-xl bg-accent shadow-lg">
                      <Server className="h-7 w-7 md:h-8 md:w-8 text-accent-foreground" />
                    </div>
                    <div className="absolute -left-12 top-1/2 -translate-y-1/2 whitespace-nowrap">
                      <span className="text-xs font-medium text-muted-foreground">Server</span>
                    </div>
                    {/* Connection line to center */}
                    <div
                      className="absolute left-full top-1/2 w-[60px] md:w-[80px] h-0.5 bg-gradient-to-r from-accent to-transparent animate-line-draw origin-left"
                      style={{ animationDelay: "1.5s" }}
                    />
                    {/* Data pulse */}
                    <div
                      className="absolute left-full top-1/2 -translate-y-1/2 animate-data-pulse-horizontal-reverse"
                      style={{ animationDelay: "2.7s" }}
                    >
                      <div className="h-2 w-2 rounded-full bg-accent shadow-lg" />
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-center text-xs md:text-sm text-muted-foreground mt-4">
                All devices connect through a central router to form a network
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PacketsAnswerSlide() {
  return (
    <div className="flex h-full w-full items-center justify-center px-4 md:px-8 py-8 overflow-hidden">
      <div className="max-w-6xl w-full">
        <div className="space-y-6 md:space-y-8 animate-slide-in-up">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent/20 px-4 py-2 text-xs md:text-sm font-medium text-accent-foreground md:px-6">
            <Box className="h-4 w-4" />
            Data Packets
          </div>

          <div className="grid gap-6 md:gap-8 lg:grid-cols-2 items-center">
            {/* Left side - Explanation */}
            <div className="space-y-4 md:space-y-6 rounded-2xl bg-card p-6 md:p-8 shadow-2xl border border-border">
              <h3 className="font-sans text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-foreground text-balance">
                Packets are small units of data
              </h3>
              <div className="space-y-3 md:space-y-4 text-muted-foreground leading-relaxed">
                <p className="text-sm md:text-base lg:text-lg">
                  When you send information over the internet, it's broken down into small chunks called{" "}
                  <span className="font-bold text-primary">packets</span>.
                </p>
                <p className="text-sm md:text-base lg:text-lg">Each packet contains:</p>
                <ul className="space-y-2 pl-4 md:pl-6">
                  <li className="flex items-start gap-2 text-sm md:text-base">
                    <span className="text-primary flex-shrink-0">•</span>
                    <span>
                      <strong>Data:</strong> Part of your message
                    </span>
                  </li>
                  <li className="flex items-start gap-2 text-sm md:text-base">
                    <span className="text-secondary flex-shrink-0">•</span>
                    <span>
                      <strong>Header:</strong> Destination address
                    </span>
                  </li>
                  <li className="flex items-start gap-2 text-sm md:text-base">
                    <span className="text-accent-foreground flex-shrink-0">•</span>
                    <span>
                      <strong>Footer:</strong> Error checking info
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Right side - Animation */}
            <div className="rounded-2xl bg-card p-6 md:p-8 shadow-2xl border border-border">
              <div className="relative h-64 md:h-80 flex items-center justify-between px-4">
                {/* Source device */}
                <div className="flex flex-col items-center gap-2 md:gap-3 z-10">
                  <div className="flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-2xl bg-primary shadow-lg">
                    <Globe className="h-8 w-8 md:h-10 md:w-10 text-primary-foreground" />
                  </div>
                  <span className="text-xs md:text-sm font-medium text-muted-foreground">Source</span>
                </div>

                <div className="absolute left-[30%] right-[30%] top-1/2 -translate-y-1/2">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="absolute left-0 flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-lg bg-gradient-to-r from-primary to-secondary shadow-lg animate-packet"
                      style={{
                        animationDelay: `${i * 0.8}s`,
                      }}
                    >
                      <Box className="h-5 w-5 md:h-6 md:w-6 text-primary-foreground" />
                    </div>
                  ))}
                  {/* Connection line */}
                  <div className="h-1 w-full bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 rounded-full" />
                </div>

                {/* Destination device */}
                <div className="flex flex-col items-center gap-2 md:gap-3 z-10">
                  <div className="flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-2xl bg-secondary shadow-lg">
                    <Server className="h-8 w-8 md:h-10 md:w-10 text-secondary-foreground" />
                  </div>
                  <span className="text-xs md:text-sm font-medium text-muted-foreground">Destination</span>
                </div>
              </div>
              <p className="text-center text-xs md:text-sm text-muted-foreground mt-4">
                Packets travel independently and reassemble at the destination
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function IPAddressAnswerSlide() {
  return (
    <div className="flex h-full w-full items-center justify-center px-4 md:px-8 py-8 overflow-hidden">
      <div className="max-w-6xl w-full">
        <div className="space-y-6 md:space-y-8 animate-slide-in-up">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-xs md:text-sm font-medium text-primary md:px-6">
            <MapPin className="h-4 w-4" />
            IP Addresses
          </div>

          <div className="grid gap-6 md:gap-8 lg:grid-cols-2 items-start">
            {/* Left side - Explanation */}
            <div className="space-y-4 md:space-y-6">
              <div className="rounded-2xl bg-card p-6 md:p-8 shadow-2xl border border-border">
                <h3 className="font-sans text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-foreground text-balance mb-4">
                  IP Addresses are unique identifiers
                </h3>
                <p className="text-sm md:text-base lg:text-lg text-muted-foreground leading-relaxed">
                  Every device on a network needs an address to send and receive data
                </p>
              </div>

              {/* Private vs Public */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-card p-4 md:p-6 shadow-lg border border-primary/20">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-black text-primary">P</span>
                    </div>
                    <h4 className="font-bold text-foreground">Private IP</h4>
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed mb-2">
                    Used within local networks
                  </p>
                  <code className="text-xs bg-primary/5 px-2 py-1 rounded">192.168.1.x</code>
                </div>

                <div className="rounded-xl bg-card p-4 md:p-6 shadow-lg border border-secondary/20">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                      <span className="text-lg font-black text-secondary">P</span>
                    </div>
                    <h4 className="font-bold text-foreground">Public IP</h4>
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed mb-2">Used on the internet</p>
                  <code className="text-xs bg-secondary/5 px-2 py-1 rounded">203.0.113.45</code>
                </div>
              </div>
            </div>

            {/* Right side - Visual Diagram */}
            <div className="rounded-2xl bg-card p-6 md:p-8 shadow-2xl border border-border">
              <div className="space-y-6">
                {/* Home Network (Private IPs) */}
                <div className="rounded-xl bg-primary/5 p-4 md:p-6 border-2 border-primary/20">
                  <div className="flex items-center gap-2 mb-4">
                    <Network className="h-5 w-5 text-primary" />
                    <h4 className="font-bold text-foreground">Home Network (Private)</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { name: "Laptop", ip: "192.168.1.2" },
                      { name: "Phone", ip: "192.168.1.3" },
                      { name: "Tablet", ip: "192.168.1.4" },
                      { name: "Desktop", ip: "192.168.1.5" },
                    ].map((device, i) => (
                      <div
                        key={device.name}
                        className="bg-card rounded-lg p-3 border border-primary/10 animate-slide-in-up"
                        style={{ animationDelay: `${0.3 + i * 0.1}s` }}
                      >
                        <p className="text-xs font-semibold text-foreground mb-1">{device.name}</p>
                        <code className="text-xs text-primary">{device.ip}</code>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Router with NAT */}
                <div className="flex items-center justify-center">
                  <div className="relative">
                    <div className="absolute -top-2 -left-2 -right-2 -bottom-2 bg-accent/20 rounded-xl blur-sm animate-pulse-slow" />
                    <div className="relative rounded-xl bg-accent/80 p-4 border-2 border-accent">
                      <div className="text-center">
                        <Wifi className="h-6 w-6 text-accent-foreground mx-auto mb-2" />
                        <p className="text-xs font-bold text-accent-foreground mb-1">Router (NAT)</p>
                        <code className="text-xs text-accent-foreground">Public: 203.0.113.45</code>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Internet */}
                <div className="rounded-xl bg-secondary/5 p-4 border-2 border-secondary/20 text-center">
                  <Globe className="h-8 w-8 text-secondary mx-auto mb-2" />
                  <p className="text-sm font-bold text-foreground">Internet (Public IPs)</p>
                  <p className="text-xs text-muted-foreground mt-1">All devices share one public IP</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DNSAnswerSlide() {
  return (
    <div className="flex h-full w-full items-center justify-center px-4 md:px-8 py-8 overflow-hidden">
      <div className="max-w-6xl w-full">
        <div className="space-y-6 md:space-y-8 animate-slide-in-up">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary/10 px-4 py-2 text-xs md:text-sm font-medium text-secondary md:px-6">
            <Search className="h-4 w-4" />
            DNS (Domain Name System)
          </div>

          <div className="grid gap-6 md:gap-8 lg:grid-cols-2 items-center">
            {/* Left side - Explanation */}
            <div className="space-y-4 md:space-y-6 rounded-2xl bg-card p-6 md:p-8 shadow-2xl border border-border">
              <h3 className="font-sans text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-foreground text-balance">
                DNS translates domain names to IP addresses
              </h3>
              <p className="text-sm md:text-base lg:text-lg text-muted-foreground leading-relaxed">
                It's like a phonebook for the internet - converting human-readable names into computer-readable
                addresses
              </p>

              <div className="space-y-3 pt-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                    <span className="text-xl font-black text-primary">1</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">You type a domain</p>
                    <code className="text-xs text-muted-foreground">example.com</code>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/5 border border-secondary/20">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10 flex-shrink-0">
                    <span className="text-xl font-black text-secondary">2</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">DNS server looks it up</p>
                    <p className="text-xs text-muted-foreground">Searches its database</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/10 border border-accent/20">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20 flex-shrink-0">
                    <span className="text-xl font-black text-accent-foreground">3</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Returns IP address</p>
                    <code className="text-xs text-muted-foreground">93.184.216.34</code>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side - DNS Animation */}
            <div className="rounded-2xl bg-card p-6 md:p-8 shadow-2xl border border-border">
              <div className="space-y-6">
                {/* User/Browser */}
                <div
                  className="rounded-xl bg-primary/5 p-4 border border-primary/20 animate-slide-in-up"
                  style={{ animationDelay: "0.2s" }}
                >
                  <div className="flex items-center gap-3">
                    <Monitor className="h-8 w-8 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-foreground mb-1">Your Browser</p>
                      <div className="bg-card rounded px-3 py-2 border border-primary/10">
                        <code className="text-xs text-primary">www.example.com</code>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Arrow Down with animation */}
                <div className="flex justify-center">
                  <div className="flex flex-col items-center gap-1 animate-bounce-slow">
                    <div className="h-12 w-0.5 bg-gradient-to-b from-primary to-secondary" />
                    <ChevronDown className="h-5 w-5 text-secondary" />
                  </div>
                </div>

                {/* DNS Server */}
                <div
                  className="rounded-xl bg-secondary/5 p-4 border border-secondary/20 animate-slide-in-up"
                  style={{ animationDelay: "0.4s" }}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Server className="h-8 w-8 text-secondary" />
                      <div className="absolute -top-1 -right-1 h-3 w-3 bg-secondary rounded-full animate-ping" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-foreground mb-1">DNS Server</p>
                      <p className="text-xs text-muted-foreground">Looking up address...</p>
                    </div>
                  </div>
                </div>

                {/* Arrow Down */}
                <div className="flex justify-center">
                  <div
                    className="flex flex-col items-center gap-1 animate-bounce-slow"
                    style={{ animationDelay: "0.5s" }}
                  >
                    <div className="h-12 w-0.5 bg-gradient-to-b from-secondary to-accent" />
                    <ChevronDown className="h-5 w-5 text-accent" />
                  </div>
                </div>

                {/* IP Address Result */}
                <div
                  className="rounded-xl bg-accent/10 p-4 border-2 border-accent/30 animate-slide-in-up"
                  style={{ animationDelay: "0.6s" }}
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="h-8 w-8 text-accent-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-foreground mb-1">IP Address Found!</p>
                      <div className="bg-card rounded px-3 py-2 border border-accent/20">
                        <code className="text-xs text-accent-foreground font-bold">93.184.216.34</code>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ISPAnswerSlide() {
  return (
    <div className="flex h-full w-full items-center justify-center px-4 md:px-8 py-8 overflow-hidden">
      <div className="max-w-6xl w-full">
        <div className="space-y-6 md:space-y-8 animate-slide-in-up">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent/20 px-4 py-2 text-xs md:text-sm font-medium text-accent-foreground md:px-6">
            <Wifi className="h-4 w-4" />
            Internet Service Provider
          </div>

          <div className="grid gap-6 md:gap-8 lg:grid-cols-2 items-center">
            {/* Left side - Explanation */}
            <div className="space-y-4 md:space-y-6 rounded-2xl bg-card p-6 md:p-8 shadow-2xl border border-border">
              <h3 className="font-sans text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-foreground text-balance">
                An ISP connects you to the Internet
              </h3>
              <p className="text-sm md:text-base lg:text-lg text-muted-foreground leading-relaxed">
                Internet Service Providers are companies that provide internet access to homes and businesses
              </p>

              <div className="space-y-3 pt-4">
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <h4 className="font-bold text-foreground mb-2 flex items-center gap-2">
                    <span className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center text-xs text-primary">
                      ✓
                    </span>
                    Provides Connection
                  </h4>
                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                    Gives you access to the global internet
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-secondary/5 border border-secondary/20">
                  <h4 className="font-bold text-foreground mb-2 flex items-center gap-2">
                    <span className="h-6 w-6 rounded bg-secondary/10 flex items-center justify-center text-xs text-secondary">
                      ✓
                    </span>
                    Assigns IP Address
                  </h4>
                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                    Gives you a public IP to communicate
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
                  <h4 className="font-bold text-foreground mb-2 flex items-center gap-2">
                    <span className="h-6 w-6 rounded bg-accent/20 flex items-center justify-center text-xs text-accent-foreground">
                      ✓
                    </span>
                    Routes Your Data
                  </h4>
                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                    Directs your traffic to the right destinations
                  </p>
                </div>
              </div>
            </div>

            {/* Right side - Connection Flow */}
            <div className="rounded-2xl bg-card p-6 md:p-8 shadow-2xl border border-border">
              <div className="space-y-8">
                {/* Your Home */}
                <div
                  className="rounded-xl bg-primary/5 p-6 border-2 border-primary/20 animate-slide-in-up"
                  style={{ animationDelay: "0.2s" }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
                      <Network className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground">Your Home</p>
                      <p className="text-xs text-muted-foreground">Router & Devices</p>
                    </div>
                  </div>
                </div>

                {/* Connection Arrow */}
                <div className="flex justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-16 w-1 bg-gradient-to-b from-primary via-secondary to-secondary rounded-full animate-pulse-slow" />
                    <div className="text-xs font-medium text-secondary">Connected via</div>
                  </div>
                </div>

                {/* ISP */}
                <div
                  className="rounded-xl bg-secondary/5 p-6 border-2 border-secondary/20 animate-slide-in-up relative overflow-hidden"
                  style={{ animationDelay: "0.4s" }}
                >
                  <div className="absolute top-0 right-0 h-20 w-20 bg-secondary/10 rounded-full blur-2xl" />
                  <div className="relative flex items-center gap-3 mb-3">
                    <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center">
                      <Wifi className="h-6 w-6 text-secondary-foreground" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground">Your ISP</p>
                      <p className="text-xs text-muted-foreground">Internet Service Provider</p>
                    </div>
                  </div>
                  <div className="relative bg-card rounded px-3 py-2 border border-secondary/10">
                    <p className="text-xs text-muted-foreground">Examples: Comcast, AT&T, Verizon</p>
                  </div>
                </div>

                {/* Connection Arrow */}
                <div className="flex justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-16 w-1 bg-gradient-to-b from-secondary via-accent to-accent rounded-full animate-pulse-slow" />
                    <div className="text-xs font-medium text-accent-foreground">Routes to</div>
                  </div>
                </div>

                {/* The Internet */}
                <div
                  className="rounded-xl bg-accent/10 p-6 border-2 border-accent/30 animate-slide-in-up"
                  style={{ animationDelay: "0.6s" }}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-accent flex items-center justify-center">
                      <Globe className="h-6 w-6 text-accent-foreground" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground">The Internet</p>
                      <p className="text-xs text-muted-foreground">Global Network</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function WebServerAnswerSlide() {
  return (
    <div className="flex h-full w-full items-center justify-center px-4 md:px-8 py-8 overflow-hidden">
      <div className="max-w-6xl w-full">
        <div className="space-y-6 md:space-y-8 animate-slide-in-up">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-xs md:text-sm font-medium text-primary md:px-6">
            <Monitor className="h-4 w-4" />
            Client-Server Model
          </div>

          <div className="space-y-6">
            {/* Definitions */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl bg-card p-4 md:p-6 shadow-lg border border-primary/20 animate-slide-in-up">
                <div className="flex items-center gap-2 mb-3">
                  <Monitor className="h-6 w-6 text-primary" />
                  <h4 className="font-bold text-foreground">Web Browser</h4>
                </div>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                  The <strong>client</strong> - software you use to access websites (Chrome, Firefox, Safari)
                </p>
              </div>

              <div
                className="rounded-xl bg-card p-4 md:p-6 shadow-lg border border-secondary/20 animate-slide-in-up"
                style={{ animationDelay: "0.1s" }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Server className="h-6 w-6 text-secondary" />
                  <h4 className="font-bold text-foreground">Web Server</h4>
                </div>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                  Computer that stores and serves website files to clients when requested
                </p>
              </div>

              <div
                className="rounded-xl bg-card p-4 md:p-6 shadow-lg border border-accent/20 animate-slide-in-up"
                style={{ animationDelay: "0.2s" }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Layout className="h-6 w-6 text-accent-foreground" />
                  <h4 className="font-bold text-foreground">Web Page</h4>
                </div>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                  The document (HTML, CSS, JS) that the server sends and your browser displays
                </p>
              </div>
            </div>

            {/* Request-Response Animation */}
            <div className="rounded-2xl bg-card p-6 md:p-10 shadow-2xl border border-border">
              <h3 className="font-sans text-xl md:text-2xl lg:text-3xl font-black text-center text-foreground mb-8">
                How They Work Together
              </h3>

              <div className="grid lg:grid-cols-3 gap-6 items-center">
                {/* Client/Browser */}
                <div className="space-y-4">
                  <div
                    className="rounded-xl bg-primary/5 p-6 border-2 border-primary/20 animate-slide-in-up"
                    style={{ animationDelay: "0.3s" }}
                  >
                    <div className="flex flex-col items-center text-center gap-3">
                      <div className="h-16 w-16 rounded-xl bg-primary flex items-center justify-center">
                        <Monitor className="h-8 w-8 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground mb-1">Web Browser</p>
                        <p className="text-xs text-muted-foreground">(Client)</p>
                      </div>
                    </div>
                  </div>

                  <div
                    className="rounded-lg bg-primary/5 p-4 border border-primary/10 animate-slide-in-up"
                    style={{ animationDelay: "0.4s" }}
                  >
                    <p className="text-xs font-semibold text-primary mb-2">1. Sends Request</p>
                    <code className="text-xs text-muted-foreground break-all">GET /index.html</code>
                  </div>

                  <div
                    className="rounded-lg bg-accent/10 p-4 border border-accent/20 animate-slide-in-up"
                    style={{ animationDelay: "0.8s" }}
                  >
                    <p className="text-xs font-semibold text-accent-foreground mb-2">3. Displays Page</p>
                    <p className="text-xs text-muted-foreground">Renders HTML, CSS, JS</p>
                  </div>
                </div>

                {/* Connection Animation */}
                <div className="flex items-center justify-center">
                  <div className="relative w-full max-w-[200px]">
                    {/* Request Arrow */}
                    <div className="mb-8">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 bg-gradient-to-r from-primary to-secondary rounded-full relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" />
                        </div>
                        <ChevronDown className="h-5 w-5 text-secondary rotate-[-90deg]" />
                      </div>
                      <p className="text-xs text-center text-primary mt-1 font-medium">Request →</p>
                    </div>

                    {/* Response Arrow */}
                    <div>
                      <div className="flex items-center gap-2">
                        <ChevronDown className="h-5 w-5 text-accent-foreground rotate-90" />
                        <div className="flex-1 h-1 bg-gradient-to-l from-accent to-secondary rounded-full relative overflow-hidden">
                          <div
                            className="absolute inset-0 bg-gradient-to-l from-transparent via-white/50 to-transparent animate-shimmer"
                            style={{ animationDelay: "0.5s" }}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-center text-accent-foreground mt-1 font-medium">← Response</p>
                    </div>
                  </div>
                </div>

                {/* Server */}
                <div className="space-y-4">
                  <div
                    className="rounded-xl bg-secondary/5 p-6 border-2 border-secondary/20 animate-slide-in-up"
                    style={{ animationDelay: "0.5s" }}
                  >
                    <div className="flex flex-col items-center text-center gap-3">
                      <div className="h-16 w-16 rounded-xl bg-secondary flex items-center justify-center relative">
                        <Server className="h-8 w-8 text-secondary-foreground" />
                        <div className="absolute -top-1 -right-1 h-3 w-3 bg-secondary rounded-full animate-ping" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground mb-1">Web Server</p>
                        <p className="text-xs text-muted-foreground">(Server)</p>
                      </div>
                    </div>
                  </div>

                  <div
                    className="rounded-lg bg-secondary/5 p-4 border border-secondary/10 animate-slide-in-up"
                    style={{ animationDelay: "0.6s" }}
                  >
                    <p className="text-xs font-semibold text-secondary mb-2">2. Processes Request</p>
                    <p className="text-xs text-muted-foreground">Finds & prepares files</p>
                  </div>

                  <div
                    className="rounded-lg bg-accent/10 p-4 border border-accent/20 animate-slide-in-up"
                    style={{ animationDelay: "0.7s" }}
                  >
                    <p className="text-xs font-semibold text-accent-foreground mb-2">Sends Response</p>
                    <div className="flex items-center gap-2">
                      <Layout className="h-4 w-4 text-accent-foreground" />
                      <code className="text-xs text-muted-foreground">HTML + CSS + JS</code>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ExerciseSlide() {
  return (
    <div className="relative flex h-full w-full items-center justify-center px-4 md:px-8 overflow-hidden">
      <div className="relative max-w-5xl w-full">
        <div className="absolute left-[10%] top-[20%] h-32 w-32 rounded-full bg-accent/20 blur-3xl animate-float" />
        <div
          className="absolute right-[15%] bottom-[25%] h-40 w-40 rounded-full bg-primary/10 blur-3xl animate-float"
          style={{ animationDelay: "1s" }}
        />

        <div className="relative z-10 space-y-8 animate-slide-in-up px-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent/20 px-6 py-3 text-sm font-bold text-accent-foreground">
            <Lightbulb className="h-5 w-5" />
            Exercise Challenge
          </div>

          <div className="space-y-6 rounded-2xl bg-card p-8 md:p-12 shadow-2xl border-2 border-accent/30">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 md:h-16 md:w-16 items-center justify-center rounded-xl bg-accent/20 flex-shrink-0">
                <Search className="h-6 w-6 md:h-8 md:w-8 text-accent-foreground" />
              </div>
              <div className="flex-1 space-y-4">
                <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-foreground text-balance">
                  Describe what happens when you do a Google search
                </h2>
                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed text-balance">
                  Starting from opening your browser to reaching the web page you were looking for
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-3 rounded-xl bg-accent/5 p-6 border border-accent/20">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-accent/20 flex items-center justify-center text-xs text-accent-foreground">
                  💡
                </span>
                Think about:
              </p>
              <ul className="space-y-2 pl-8 text-sm md:text-base text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary flex-shrink-0">•</span>
                  <span>What role does DNS play?</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-secondary flex-shrink-0">•</span>
                  <span>How does your ISP help?</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-foreground flex-shrink-0">•</span>
                  <span>What happens between the browser and servers?</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary flex-shrink-0">•</span>
                  <span>How do packets travel?</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function GoogleSearchPhase1Slide() {
  return (
    <div className="flex h-full w-full items-center justify-center p-4 sm:p-6 md:p-8 overflow-hidden">
      <div className="max-w-4xl w-full space-y-4 sm:space-y-6">
        {/* Phase Badge */}
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary sm:px-4 sm:py-2 sm:text-sm animate-slide-in-up">
          <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4" />
          Phase 1 of 6
        </div>

        {/* Main Card */}
        <div className="rounded-xl sm:rounded-2xl bg-card p-4 sm:p-6 md:p-8 shadow-xl border border-border animate-slide-in-up">
          <h3 className="font-sans text-xl sm:text-2xl md:text-3xl font-black text-foreground mb-4 sm:mb-6 text-balance">
            Opening Browser & Initial Request
          </h3>

          <div className="space-y-3 sm:space-y-4">
            {/* Step 1 */}
            <div
              className="flex items-start gap-3 p-3 sm:p-4 rounded-lg bg-primary/5 border border-primary/20 animate-slide-in-up"
              style={{ animationDelay: "0.2s" }}
            >
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-primary flex-shrink-0">
                <Monitor className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">1</span>
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-foreground">Open Your Browser</h4>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Launch Chrome, Firefox, Safari, or any web browser
                </p>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center py-1">
              <ChevronDown className="h-6 w-6 text-secondary animate-bounce-slow" />
            </div>

            {/* Step 2 */}
            <div
              className="flex items-start gap-3 p-3 sm:p-4 rounded-lg bg-secondary/5 border border-secondary/20 animate-slide-in-up"
              style={{ animationDelay: "0.4s" }}
            >
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-secondary flex-shrink-0">
                <Search className="h-5 w-5 sm:h-6 sm:w-6 text-secondary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="h-6 w-6 rounded bg-secondary/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-secondary">2</span>
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-foreground">Type "google.com"</h4>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-2">
                  Enter the domain name and press Enter
                </p>
                <div className="bg-card rounded px-3 py-2 border border-secondary/10">
                  <code className="text-xs text-secondary font-mono break-all">https://google.com</code>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center py-1">
              <ChevronDown className="h-6 w-6 text-accent-foreground animate-bounce-slow" />
            </div>

            {/* Step 3 */}
            <div
              className="flex items-start gap-3 p-3 sm:p-4 rounded-lg bg-accent/10 border border-accent/30 animate-slide-in-up"
              style={{ animationDelay: "0.6s" }}
            >
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-accent flex-shrink-0">
                <Box className="h-5 w-5 sm:h-6 sm:w-6 text-accent-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="h-6 w-6 rounded bg-accent/30 flex items-center justify-center">
                    <span className="text-xs font-bold text-accent-foreground">3</span>
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-foreground">DNS Lookup</h4>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  DNS translates domain to IP address
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-card rounded px-2 py-1.5 border border-accent/10">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Domain</p>
                    <code className="text-xs text-foreground font-mono break-all">google.com</code>
                  </div>
                  <div className="bg-card rounded px-2 py-1.5 border border-accent/10">
                    <p className="text-[10px] text-muted-foreground mb-0.5">IP</p>
                    <code className="text-xs text-accent-foreground font-mono">142.250.185.46</code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function GoogleSearchPhase2Slide() {
  return (
    <div className="flex h-full w-full items-center justify-center p-4 sm:p-6 md:p-8 overflow-hidden">
      <div className="max-w-4xl w-full space-y-4 sm:space-y-6">
        {/* Phase Badge */}
        <div className="inline-flex items-center gap-2 rounded-full bg-secondary/10 px-3 py-1.5 text-xs font-medium text-secondary sm:px-4 sm:py-2 sm:text-sm animate-slide-in-up">
          <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4" />
          Phase 2 of 6
        </div>

        {/* Main Card */}
        <div className="rounded-xl sm:rounded-2xl bg-card p-4 sm:p-6 md:p-8 shadow-xl border border-border animate-slide-in-up">
          <h3 className="font-sans text-xl sm:text-2xl md:text-3xl font-black text-foreground mb-4 sm:mb-6 text-balance">
            Connecting to Google
          </h3>

          <div className="space-y-3 sm:space-y-4">
            {/* Step 4 */}
            <div
              className="flex items-start gap-3 p-3 sm:p-4 rounded-lg bg-primary/5 border border-primary/20 animate-slide-in-up"
              style={{ animationDelay: "0.2s" }}
            >
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-primary flex-shrink-0">
                <Wifi className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">4</span>
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-foreground">Connect via ISP</h4>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Your ISP routes request packets to Google's servers
                </p>
              </div>
            </div>

            {/* Connection Visual */}
            <div className="flex justify-center py-2 sm:py-3">
              <div className="flex items-center gap-2 sm:gap-4 w-full max-w-sm">
                <div className="flex flex-col items-center gap-1">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Monitor className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">You</span>
                </div>

                <div className="flex-1 relative">
                  <div className="h-0.5 bg-gradient-to-r from-primary via-secondary to-accent rounded-full">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" />
                  </div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="bg-card px-2 py-0.5 rounded-full border border-secondary/20">
                      <span className="text-[10px] font-medium text-secondary">ISP</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-accent/10 flex items-center justify-center border border-accent/20">
                    <Server className="h-5 w-5 sm:h-6 sm:w-6 text-accent-foreground" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">Google</span>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center py-1">
              <ChevronDown className="h-6 w-6 text-secondary animate-bounce-slow" />
            </div>

            {/* Step 5 */}
            <div
              className="flex items-start gap-3 p-3 sm:p-4 rounded-lg bg-secondary/5 border border-secondary/20 animate-slide-in-up"
              style={{ animationDelay: "0.4s" }}
            >
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-secondary flex-shrink-0">
                <Layout className="h-5 w-5 sm:h-6 sm:w-6 text-secondary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="h-6 w-6 rounded bg-secondary/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-secondary">5</span>
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-foreground">Receive Homepage</h4>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-2">
                  Google sends HTML, CSS, and JavaScript files
                </p>
                <div className="flex gap-2">
                  <div className="bg-card rounded px-2 py-1 border border-secondary/10 text-center flex-1">
                    <code className="text-xs text-secondary font-mono">HTML</code>
                  </div>
                  <div className="bg-card rounded px-2 py-1 border border-secondary/10 text-center flex-1">
                    <code className="text-xs text-secondary font-mono">CSS</code>
                  </div>
                  <div className="bg-card rounded px-2 py-1 border border-secondary/10 text-center flex-1">
                    <code className="text-xs text-secondary font-mono">JS</code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function GoogleSearchPhase3Slide() {
  return (
    <div className="flex h-full w-full items-center justify-center p-4 sm:p-6 md:p-8 overflow-hidden">
      <div className="max-w-4xl w-full space-y-4 sm:space-y-6">
        {/* Phase Badge */}
        <div className="inline-flex items-center gap-2 rounded-full bg-accent/20 px-3 py-1.5 text-xs font-medium text-accent-foreground sm:px-4 sm:py-2 sm:text-sm animate-slide-in-up">
          <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4" />
          Phase 3 of 6
        </div>

        {/* Main Card */}
        <div className="rounded-xl sm:rounded-2xl bg-card p-4 sm:p-6 md:p-8 shadow-xl border border-border animate-slide-in-up">
          <h3 className="font-sans text-xl sm:text-2xl md:text-3xl font-black text-foreground mb-4 sm:mb-6 text-balance">
            Making Your Search
          </h3>

          <div className="space-y-3 sm:space-y-4">
            {/* Step 6 */}
            <div
              className="flex items-start gap-3 p-3 sm:p-4 rounded-lg bg-primary/5 border border-primary/20 animate-slide-in-up"
              style={{ animationDelay: "0.2s" }}
            >
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-primary flex-shrink-0">
                <Monitor className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">6</span>
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-foreground">Page Renders</h4>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Browser displays Google homepage with search box
                </p>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center py-1">
              <ChevronDown className="h-6 w-6 text-secondary animate-bounce-slow" />
            </div>

            {/* Step 7 */}
            <div
              className="flex items-start gap-3 p-3 sm:p-4 rounded-lg bg-secondary/5 border border-secondary/20 animate-slide-in-up"
              style={{ animationDelay: "0.4s" }}
            >
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-secondary flex-shrink-0">
                <Search className="h-5 w-5 sm:h-6 sm:w-6 text-secondary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="h-6 w-6 rounded bg-secondary/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-secondary">7</span>
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-foreground">Type Search Query</h4>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-2">
                  Enter what you're looking for and press Enter
                </p>
                <div className="bg-card rounded px-3 py-2 border border-secondary/10">
                  <code className="text-xs text-secondary font-mono">best pizza near me</code>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center py-1">
              <ChevronDown className="h-6 w-6 text-accent-foreground animate-bounce-slow" />
            </div>

            {/* Step 8 */}
            <div
              className="flex items-start gap-3 p-3 sm:p-4 rounded-lg bg-accent/10 border border-accent/30 animate-slide-in-up"
              style={{ animationDelay: "0.6s" }}
            >
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-accent flex-shrink-0">
                <Box className="h-5 w-5 sm:h-6 sm:w-6 text-accent-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="h-6 w-6 rounded bg-accent/30 flex items-center justify-center">
                    <span className="text-xs font-bold text-accent-foreground">8</span>
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-foreground">Send Request</h4>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Query packaged as packets and sent to Google via ISP
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function GoogleSearchPhase4Slide() {
  return (
    <div className="flex h-full w-full items-center justify-center p-4 sm:p-6 md:p-8 overflow-hidden">
      <div className="max-w-4xl w-full space-y-4 sm:space-y-6">
        {/* Phase Badge */}
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary sm:px-4 sm:py-2 sm:text-sm animate-slide-in-up">
          <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4" />
          Phase 4 of 6
        </div>

        {/* Main Card */}
        <div className="rounded-xl sm:rounded-2xl bg-card p-4 sm:p-6 md:p-8 shadow-xl border border-border animate-slide-in-up">
          <h3 className="font-sans text-xl sm:text-2xl md:text-3xl font-black text-foreground mb-4 sm:mb-6 text-balance">
            Receiving Search Results
          </h3>

          <div className="space-y-3 sm:space-y-4">
            {/* Step 9 */}
            <div
              className="flex items-start gap-3 p-3 sm:p-4 rounded-lg bg-primary/5 border border-primary/20 animate-slide-in-up"
              style={{ animationDelay: "0.2s" }}
            >
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-primary flex-shrink-0">
                <Server className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">9</span>
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-foreground">Google Processes Search</h4>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-2">
                  Servers search billions of pages for relevant results
                </p>
                <div className="bg-card rounded px-3 py-2 border border-primary/10">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
                    <span className="text-xs text-muted-foreground">Searching...</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Processing Visual */}
            <div className="flex justify-center py-2">
              <div className="grid grid-cols-3 gap-2 w-full max-w-xs">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="rounded bg-primary/5 p-2 border border-primary/20 animate-pulse-slow"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  >
                    <div className="h-1 bg-primary/20 rounded mb-1" />
                    <div className="h-1 bg-primary/10 rounded" />
                  </div>
                ))}
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center py-1">
              <ChevronDown className="h-6 w-6 text-secondary animate-bounce-slow" />
            </div>

            {/* Step 10 */}
            <div
              className="flex items-start gap-3 p-3 sm:p-4 rounded-lg bg-secondary/5 border border-secondary/20 animate-slide-in-up"
              style={{ animationDelay: "0.4s" }}
            >
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-secondary flex-shrink-0">
                <Layout className="h-5 w-5 sm:h-6 sm:w-6 text-secondary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="h-6 w-6 rounded bg-secondary/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-secondary">10</span>
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-foreground">Receive Results Page</h4>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-2">
                  Google sends HTML page with ranked search results
                </p>
                <div className="space-y-1.5">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="bg-card rounded px-3 py-2 border border-secondary/10 animate-slide-in-up"
                      style={{ animationDelay: `${0.5 + i * 0.1}s` }}
                    >
                      <div className="flex items-center gap-2">
                        <Globe className="h-3 w-3 text-secondary" />
                        <span className="text-xs text-muted-foreground">Result {i}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function GoogleSearchPhase5Slide() {
  return (
    <div className="flex h-full w-full items-center justify-center p-4 sm:p-6 md:p-8 overflow-hidden">
      <div className="max-w-4xl w-full space-y-4 sm:space-y-6">
        {/* Phase Badge */}
        <div className="inline-flex items-center gap-2 rounded-full bg-secondary/10 px-3 py-1.5 text-xs font-medium text-secondary sm:px-4 sm:py-2 sm:text-sm animate-slide-in-up">
          <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4" />
          Phase 5 of 6
        </div>

        {/* Main Card */}
        <div className="rounded-xl sm:rounded-2xl bg-card p-4 sm:p-6 md:p-8 shadow-xl border border-border animate-slide-in-up">
          <h3 className="font-sans text-xl sm:text-2xl md:text-3xl font-black text-foreground mb-4 sm:mb-6 text-balance">
            Clicking a Result
          </h3>

          <div className="space-y-3 sm:space-y-4">
            {/* Step 11 */}
            <div
              className="flex items-start gap-3 p-3 sm:p-4 rounded-lg bg-primary/5 border border-primary/20 animate-slide-in-up"
              style={{ animationDelay: "0.2s" }}
            >
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-primary flex-shrink-0">
                <Globe className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">11</span>
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-foreground">Click a Result</h4>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-2">
                  Select the website you want to visit
                </p>
                <div className="bg-card rounded px-3 py-2 border border-primary/10">
                  <code className="text-xs text-primary font-mono break-all">example-pizza.com</code>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center py-1">
              <ChevronDown className="h-6 w-6 text-secondary animate-bounce-slow" />
            </div>

            {/* Step 12 */}
            <div
              className="flex items-start gap-3 p-3 sm:p-4 rounded-lg bg-secondary/5 border border-secondary/20 animate-slide-in-up"
              style={{ animationDelay: "0.4s" }}
            >
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-secondary flex-shrink-0">
                <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-secondary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="h-6 w-6 rounded bg-secondary/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-secondary">12</span>
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-foreground">DNS Lookup</h4>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-2">
                  DNS translates website domain to IP address
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-card rounded px-2 py-1.5 border border-secondary/10">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Domain</p>
                    <code className="text-xs text-foreground font-mono break-all">example-pizza.com</code>
                  </div>
                  <div className="bg-card rounded px-2 py-1.5 border border-secondary/10">
                    <p className="text-[10px] text-muted-foreground mb-0.5">IP</p>
                    <code className="text-xs text-secondary font-mono">198.51.100.42</code>
                  </div>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center py-1">
              <ChevronDown className="h-6 w-6 text-accent-foreground animate-bounce-slow" />
            </div>

            {/* Step 13 */}
            <div
              className="flex items-start gap-3 p-3 sm:p-4 rounded-lg bg-accent/10 border border-accent/30 animate-slide-in-up"
              style={{ animationDelay: "0.6s" }}
            >
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-accent flex-shrink-0">
                <Network className="h-5 w-5 sm:h-6 sm:w-6 text-accent-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="h-6 w-6 rounded bg-accent/30 flex items-center justify-center">
                    <span className="text-xs font-bold text-accent-foreground">13</span>
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-foreground">Connect to Server</h4>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Browser connects to website's server via ISP
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function GoogleSearchPhase6Slide() {
  return (
    <div className="flex h-full w-full items-center justify-center p-4 sm:p-6 md:p-8 overflow-hidden">
      <div className="max-w-4xl w-full space-y-4 sm:space-y-6">
        {/* Phase Badge */}
        <div className="inline-flex items-center gap-2 rounded-full bg-accent/20 px-3 py-1.5 text-xs font-medium text-accent-foreground sm:px-4 sm:py-2 sm:text-sm animate-slide-in-up">
          <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4" />
          Phase 6 of 6
        </div>

        {/* Main Card */}
        <div className="rounded-xl sm:rounded-2xl bg-card p-4 sm:p-6 md:p-8 shadow-xl border border-border animate-slide-in-up">
          <h3 className="font-sans text-xl sm:text-2xl md:text-3xl font-black text-foreground mb-4 sm:mb-6 text-balance">
            Final Destination
          </h3>

          <div className="space-y-3 sm:space-y-4">
            {/* Step 14 */}
            <div
              className="flex items-start gap-3 p-3 sm:p-4 rounded-lg bg-primary/5 border border-primary/20 animate-slide-in-up"
              style={{ animationDelay: "0.2s" }}
            >
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-primary flex-shrink-0">
                <Server className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">14</span>
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-foreground">Server Sends Page</h4>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-2">
                  Website sends HTML, CSS, JS, and images as packets
                </p>
                <div className="flex gap-1.5">
                  {["HTML", "CSS", "JS", "IMG"].map((type) => (
                    <div key={type} className="bg-card rounded px-2 py-1 border border-primary/10 text-center flex-1">
                      <code className="text-[10px] sm:text-xs text-primary font-mono">{type}</code>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Transfer Visual */}
            <div className="flex justify-center py-2">
              <div className="flex items-center gap-2 sm:gap-3 w-full max-w-xs">
                <div className="flex flex-col items-center gap-1">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Server className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">Server</span>
                </div>

                <div className="flex-1 relative">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-6 rounded bg-gradient-to-r from-primary to-secondary flex items-center justify-center animate-packet"
                      style={{ animationDelay: `${i * 0.6}s` }}
                    >
                      <Box className="h-3 w-3 text-primary-foreground" />
                    </div>
                  ))}
                  <div className="h-0.5 bg-gradient-to-r from-primary to-secondary rounded-full opacity-20" />
                </div>

                <div className="flex flex-col items-center gap-1">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-secondary/10 flex items-center justify-center border border-secondary/20">
                    <Monitor className="h-5 w-5 sm:h-6 sm:w-6 text-secondary" />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">You</span>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center py-1">
              <ChevronDown className="h-6 w-6 text-accent-foreground animate-bounce-slow" />
            </div>

            {/* Step 15 - Final */}
            <div
              className="flex items-start gap-3 p-3 sm:p-4 rounded-lg bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/30 animate-slide-in-up relative overflow-hidden"
              style={{ animationDelay: "0.4s" }}
            >
              <div className="absolute top-0 right-0 h-20 w-20 bg-accent/10 rounded-full blur-2xl" />
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-accent flex-shrink-0 relative">
                <Layout className="h-5 w-5 sm:h-6 sm:w-6 text-accent-foreground" />
                <div className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-accent rounded-full animate-ping" />
              </div>
              <div className="flex-1 min-w-0 relative">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="h-6 w-6 rounded bg-accent/30 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-accent-foreground" />
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-foreground">Page Displays!</h4>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-2">
                  Browser renders the complete website
                </p>
                <div className="bg-card rounded px-3 py-2 border border-accent/20">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg">🎉</span>
                    <span className="text-xs font-semibold text-foreground">You've arrived!</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="mt-4 p-3 sm:p-4 rounded-lg bg-primary/5 border border-primary/5 text-center">
              <p className="text-sm sm:text-base font-bold text-foreground mb-1">All in just seconds! ⚡</p>
              <p className="text-xs text-muted-foreground">DNS, ISP, packets, and servers work seamlessly</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProcessThreadAnswerSlide() {
  return (
    <div className="flex h-full w-full items-center justify-center p-4 sm:p-6 md:p-8 overflow-hidden">
      <div className="max-w-6xl w-full space-y-4 sm:space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary sm:px-4 sm:py-2 sm:text-sm animate-slide-in-up">
          <Terminal className="h-3 w-3 sm:h-4 sm:w-4" />
          Linux Fundamentals
        </div>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          {/* Process */}
          <div className="rounded-xl sm:rounded-2xl bg-card p-4 sm:p-6 md:p-8 shadow-xl border border-primary/20 animate-slide-in-up">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-primary flex items-center justify-center">
                <Box className="h-6 w-6 sm:h-7 sm:w-7 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-sans text-xl sm:text-2xl md:text-3xl font-black text-foreground">Process</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Independent program</p>
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                A <strong className="text-foreground">process</strong> is an instance of a running program with its own
                memory space
              </p>

              {/* Process Visual */}
              <div className="rounded-lg bg-primary/5 p-4 sm:p-6 border-2 border-primary/20">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
                      <span className="text-xs font-bold text-primary-foreground">P</span>
                    </div>
                    <span className="text-sm font-bold text-foreground">Process Container</span>
                  </div>

                  <div className="space-y-2">
                    {["Code", "Data", "Stack", "Heap"].map((item, i) => (
                      <div
                        key={item}
                        className="bg-card rounded px-3 py-2 border border-primary/10 animate-slide-in-up"
                        style={{ animationDelay: `${0.2 + i * 0.1}s` }}
                      >
                        <p className="text-xs sm:text-sm font-medium text-foreground">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-primary flex-shrink-0">✓</span>
                  <span className="text-muted-foreground">Own memory space</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary flex-shrink-0">✓</span>
                  <span className="text-muted-foreground">Independent execution</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary flex-shrink-0">✓</span>
                  <span className="text-muted-foreground">Isolated from other processes</span>
                </div>
              </div>
            </div>
          </div>

          {/* Thread */}
          <div
            className="rounded-xl sm:rounded-2xl bg-card p-4 sm:p-6 md:p-8 shadow-xl border border-secondary/20 animate-slide-in-up"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-secondary flex items-center justify-center">
                <Layers className="h-6 w-6 sm:h-7 sm:w-7 text-secondary-foreground" />
              </div>
              <div>
                <h3 className="font-sans text-xl sm:text-2xl md:text-3xl font-black text-foreground">Thread</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Lightweight unit</p>
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                A <strong className="text-foreground">thread</strong> is a lightweight unit of execution within a
                process
              </p>

              {/* Thread Visual */}
              <div className="rounded-lg bg-secondary/5 p-4 sm:p-6 border-2 border-secondary/20">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded bg-secondary flex items-center justify-center">
                      <span className="text-xs font-bold text-secondary-foreground">P</span>
                    </div>
                    <span className="text-sm font-bold text-foreground">Process (Shared)</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="bg-card rounded p-2 border border-secondary/10 text-center animate-slide-in-up"
                        style={{ animationDelay: `${0.3 + i * 0.1}s` }}
                      >
                        <div className="h-6 w-6 mx-auto rounded bg-secondary/20 flex items-center justify-center mb-1">
                          <span className="text-xs font-bold text-secondary">T{i}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">Thread {i}</p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-card rounded px-3 py-2 border border-secondary/10">
                    <p className="text-xs text-center text-muted-foreground">All threads share memory</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-secondary flex-shrink-0">✓</span>
                  <span className="text-muted-foreground">Share process memory</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-secondary flex-shrink-0">✓</span>
                  <span className="text-muted-foreground">Lighter than processes</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-secondary flex-shrink-0">✓</span>
                  <span className="text-muted-foreground">Faster context switching</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Difference */}
        <div
          className="rounded-xl sm:rounded-2xl bg-card p-4 sm:p-6 shadow-xl border border-accent/20 animate-slide-in-up"
          style={{ animationDelay: "0.4s" }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-accent flex items-center justify-center">
              <Lightbulb className="h-5 w-5 sm:h-6 sm:w-6 text-accent-foreground" />
            </div>
            <h4 className="font-bold text-lg sm:text-xl text-foreground">Key Difference</h4>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Processes</strong> are independent with separate memory, while{" "}
            <strong className="text-foreground">threads</strong> share memory within the same process, making them
            faster but requiring careful synchronization.
          </p>
        </div>
      </div>
    </div>
  )
}

function ConcurrencyAnswerSlide() {
  return (
    <div className="flex h-full w-full items-center justify-center p-4 sm:p-6 md:p-8 overflow-hidden">
      <div className="max-w-6xl w-full space-y-4 sm:space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-secondary/10 px-3 py-1.5 text-xs font-medium text-secondary sm:px-4 sm:py-2 sm:text-sm animate-slide-in-up">
          <Layers className="h-3 w-3 sm:h-4 sm:w-4" />
          Execution Models
        </div>

        <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
          {/* Concurrency */}
          <div className="rounded-xl bg-card p-4 sm:p-6 shadow-xl border border-primary/20 animate-slide-in-up">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-lg font-black text-primary-foreground">C</span>
              </div>
              <div>
                <h4 className="font-bold text-base sm:text-lg text-foreground">Concurrency</h4>
                <p className="text-xs text-muted-foreground">Tasks interleaved</p>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mb-3 leading-relaxed">
              Multiple tasks make progress by switching between them (single core)
            </p>
            <div className="space-y-1.5">
              {["Task A", "Task B", "Task A", "Task B"].map((task, i) => (
                <div
                  key={i}
                  className={`rounded px-3 py-1.5 text-xs font-medium ${
                    task === "Task A" ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"
                  } animate-slide-in-up`}
                  style={{ animationDelay: `${0.2 + i * 0.1}s` }}
                >
                  {task}
                </div>
              ))}
            </div>
          </div>

          {/* Parallelism */}
          <div
            className="rounded-xl bg-card p-4 sm:p-6 shadow-xl border border-secondary/20 animate-slide-in-up"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                <span className="text-lg font-black text-secondary-foreground">P</span>
              </div>
              <div>
                <h4 className="font-bold text-base sm:text-lg text-foreground">Parallelism</h4>
                <p className="text-xs text-muted-foreground">Tasks simultaneous</p>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mb-3 leading-relaxed">
              Multiple tasks run at the exact same time (multiple cores)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground mb-1">Core 1</p>
                {["Task A", "Task A"].map((task, i) => (
                  <div
                    key={i}
                    className="rounded px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary animate-slide-in-up"
                    style={{ animationDelay: `${0.3 + i * 0.1}s` }}
                  >
                    {task}
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground mb-1">Core 2</p>
                {["Task B", "Task B"].map((task, i) => (
                  <div
                    key={i}
                    className="rounded px-3 py-1.5 text-xs font-medium bg-secondary/10 text-secondary animate-slide-in-up"
                    style={{ animationDelay: `${0.3 + i * 0.1}s` }}
                  >
                    {task}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Multithreading */}
          <div
            className="rounded-xl bg-card p-4 sm:p-6 shadow-xl border border-accent/20 animate-slide-in-up"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
                <Layers className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <h4 className="font-bold text-base sm:text-lg text-foreground">Multithreading</h4>
                <p className="text-xs text-muted-foreground">Multiple threads</p>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mb-3 leading-relaxed">
              Multiple threads within one process sharing memory
            </p>
            <div className="rounded-lg bg-accent/5 p-3 border border-accent/10">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-6 rounded bg-accent/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-accent-foreground">P</span>
                </div>
                <span className="text-xs font-semibold text-foreground">Process</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-card rounded p-2 border border-accent/10 text-center animate-slide-in-up"
                    style={{ animationDelay: `${0.4 + i * 0.1}s` }}
                  >
                    <p className="text-xs font-medium text-accent-foreground">T{i}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Multiprocessing */}
          <div
            className="rounded-xl bg-card p-4 sm:p-6 shadow-xl border border-primary/20 animate-slide-in-up"
            style={{ animationDelay: "0.3s" }}
          >
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <Box className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h4 className="font-bold text-base sm:text-lg text-foreground">Multiprocessing</h4>
                <p className="text-xs text-muted-foreground">Multiple processes</p>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mb-3 leading-relaxed">
              Multiple independent processes with separate memory
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-lg bg-primary/5 p-3 border border-primary/10 animate-slide-in-up"
                  style={{ animationDelay: `${0.5 + i * 0.1}s` }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">P{i}</span>
                    </div>
                    <span className="text-xs font-semibold text-foreground">Process {i}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="h-1 bg-primary/20 rounded" />
                    <div className="h-1 bg-primary/10 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div
          className="rounded-xl bg-card p-4 sm:p-6 shadow-xl border border-border animate-slide-in-up"
          style={{ animationDelay: "0.4s" }}
        >
          <div className="flex items-center gap-3 mb-3">
            <Lightbulb className="h-5 w-5 sm:h-6 sm:w-6 text-accent-foreground" />
            <h4 className="font-bold text-base sm:text-lg text-foreground">Summary</h4>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 text-xs sm:text-sm">
            <div className="flex items-start gap-2">
              <span className="text-primary flex-shrink-0">•</span>
              <span className="text-muted-foreground">
                <strong className="text-foreground">Concurrency:</strong> Illusion of simultaneity
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-secondary flex-shrink-0">•</span>
              <span className="text-muted-foreground">
                <strong className="text-foreground">Parallelism:</strong> True simultaneity
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-accent-foreground flex-shrink-0">•</span>
              <span className="text-muted-foreground">
                <strong className="text-foreground">Multithreading:</strong> Shared memory
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary flex-shrink-0">•</span>
              <span className="text-muted-foreground">
                <strong className="text-foreground">Multiprocessing:</strong> Isolated memory
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PathsAnswerSlide() {
  return (
    <div className="flex h-full w-full items-center justify-center p-4 sm:p-6 md:p-8 overflow-hidden">
      <div className="max-w-6xl w-full space-y-4 sm:space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-accent/20 px-3 py-1.5 text-xs font-medium text-accent-foreground sm:px-4 sm:py-2 sm:text-sm animate-slide-in-up">
          <Code2 className="h-3 w-3 sm:h-4 sm:w-4" />
          File Paths
        </div>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          {/* Absolute Path */}
          <div className="rounded-xl sm:rounded-2xl bg-card p-4 sm:p-6 md:p-8 shadow-xl border border-primary/20 animate-slide-in-up">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-primary flex items-center justify-center">
                <Terminal className="h-6 w-6 sm:h-7 sm:w-7 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-sans text-xl sm:text-2xl md:text-3xl font-black text-foreground">Absolute Path</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">From root directory</p>
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Starts from the <strong className="text-foreground">root directory (/)</strong> and specifies the
                complete path
              </p>

              {/* File Tree */}
              <div className="rounded-lg bg-primary/5 p-4 sm:p-6 border border-primary/20 font-mono text-xs sm:text-sm">
                <div className="space-y-1.5">
                  <div className="text-primary font-bold">/ (root)</div>
                  <div className="pl-4 text-muted-foreground">├── home</div>
                  <div className="pl-8 text-muted-foreground">│ └── user</div>
                  <div className="pl-12 text-muted-foreground">│ └── documents</div>
                  <div className="pl-16 text-primary font-bold animate-pulse-slow">│ └── file.txt</div>
                  <div className="pl-4 text-muted-foreground">├── var</div>
                  <div className="pl-4 text-muted-foreground">└── etc</div>
                </div>
              </div>

              {/* Example */}
              <div className="rounded-lg bg-card p-3 sm:p-4 border border-primary/10">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Example:</p>
                <code className="text-xs sm:text-sm text-primary font-mono break-all">
                  /home/user/documents/file.txt
                </code>
              </div>

              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-primary flex-shrink-0">✓</span>
                  <span className="text-muted-foreground">Always starts with /</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary flex-shrink-0">✓</span>
                  <span className="text-muted-foreground">Works from anywhere</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary flex-shrink-0">✓</span>
                  <span className="text-muted-foreground">Complete, unambiguous path</span>
                </div>
              </div>
            </div>
          </div>

          {/* Relative Path */}
          <div
            className="rounded-xl sm:rounded-2xl bg-card p-4 sm:p-6 md:p-8 shadow-xl border border-secondary/20 animate-slide-in-up"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-secondary flex items-center justify-center">
                <Code2 className="h-6 w-6 sm:h-7 sm:w-7 text-secondary-foreground" />
              </div>
              <div>
                <h3 className="font-sans text-xl sm:text-2xl md:text-3xl font-black text-foreground">Relative Path</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">From current directory</p>
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Starts from the <strong className="text-foreground">current directory</strong> and specifies path
                relative to it
              </p>

              {/* File Tree with Current Location */}
              <div className="rounded-lg bg-secondary/5 p-4 sm:p-6 border border-secondary/20 font-mono text-xs sm:text-sm">
                <div className="space-y-1.5">
                  <div className="text-muted-foreground">/ (root)</div>
                  <div className="pl-4 text-muted-foreground">├── home</div>
                  <div className="pl-8 text-secondary font-bold bg-secondary/10 inline-block px-2 py-0.5 rounded">
                    │ └── user (you are here)
                  </div>
                  <div className="pl-12 text-muted-foreground">│ └── documents</div>
                  <div className="pl-16 text-secondary font-bold animate-pulse-slow">│ └── file.txt</div>
                  <div className="pl-4 text-muted-foreground">├── var</div>
                  <div className="pl-4 text-muted-foreground">└── etc</div>
                </div>
              </div>

              {/* Examples */}
              <div className="space-y-2">
                <div className="rounded-lg bg-card p-3 border border-secondary/10">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">From /home/user:</p>
                  <code className="text-xs sm:text-sm text-secondary font-mono">documents/file.txt</code>
                </div>
                <div className="rounded-lg bg-card p-3 border border-secondary/10">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Using ./:</p>
                  <code className="text-xs sm:text-sm text-secondary font-mono">./documents/file.txt</code>
                </div>
                <div className="rounded-lg bg-card p-3 border border-secondary/10">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Go up one level (../):</p>
                  <code className="text-xs sm:text-sm text-secondary font-mono">../user/documents/file.txt</code>
                </div>
              </div>

              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-secondary flex-shrink-0">✓</span>
                  <span className="text-muted-foreground">Relative to current location</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-secondary flex-shrink-0">✓</span>
                  <span className="text-muted-foreground">Shorter, more convenient</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-secondary flex-shrink-0">✓</span>
                  <span className="text-muted-foreground">Uses . (current) and .. (parent)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Comparison */}
        <div
          className="rounded-xl sm:rounded-2xl bg-card p-4 sm:p-6 shadow-xl border border-accent/20 animate-slide-in-up"
          style={{ animationDelay: "0.4s" }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-accent flex items-center justify-center">
              <Lightbulb className="h-5 w-5 sm:h-6 sm:w-6 text-accent-foreground" />
            </div>
            <h4 className="font-bold text-lg sm:text-xl text-foreground">When to Use Each</h4>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 text-xs sm:text-sm">
            <div className="rounded-lg bg-primary/5 p-3 sm:p-4 border border-primary/10">
              <p className="font-semibold text-foreground mb-2">Use Absolute Paths:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary flex-shrink-0">•</span>
                  <span>In scripts and configuration files</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary flex-shrink-0">•</span>
                  <span>When you need certainty</span>
                </li>
              </ul>
            </div>
            <div className="rounded-lg bg-secondary/5 p-3 sm:p-4 border border-secondary/10">
              <p className="font-semibold text-foreground mb-2">Use Relative Paths:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-secondary flex-shrink-0">•</span>
                  <span>For nearby files in projects</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-secondary flex-shrink-0">•</span>
                  <span>When portability matters</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
