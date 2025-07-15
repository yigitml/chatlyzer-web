"use client"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { ArrowRight, Zap, Skull, Heart, Brain, Ghost, Star, AlertTriangle, CheckCircle, MessageCircle, Send, Twitter } from "lucide-react"
import { useAuthStore } from "@/frontend/store/authStore"

export default function Home() {
  const router = useRouter()
  const { isAuthenticated, isInitialized } = useAuthStore()

  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      router.push("/home")
    }
  }, [isAuthenticated, isInitialized, router])

  return (
    <div className="min-h-screen text-white bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      {/* Navigation */}
      <header className="container mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image src="/favicon.ico" alt="Chatlyzer" width={32} height={32} className="w-8 h-8" />
          <span className="font-bold text-xl bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Chatlyzer AI
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          <Link href="#features" className="text-gray-300 hover:text-white transition">
            Features
          </Link>
          <Link href="#analyses" className="text-gray-300 hover:text-white transition">
            Analyses
          </Link>
          <Link href="/contact" className="text-gray-300 hover:text-white transition">
            Contact
          </Link>
          <Link href="#" className="text-gray-300 hover:text-white transition flex items-center gap-2">
            Blog
            <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
              NEW
            </span>
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/auth/sign-in" className="text-gray-300 hover:text-white transition">
            Login
          </Link>
          <Link
            href="/auth/sign-in"
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium px-6 py-2 rounded-full transition-all duration-200 hover:scale-105"
          >
            Start vibing ✨
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 mt-16 text-center">
        <div className="inline-flex items-center gap-2 text-purple-300 bg-white/10 rounded-full px-4 py-2 mb-6 backdrop-blur-sm">
          <span>🔥 New: Simp-O-Meter & Ghost Risk Analysis</span>
          <Link href="#analyses" className="text-pink-300 hover:text-pink-200 flex items-center gap-1 transition">
            Check it out <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold mb-6">
          Your chats are
          <br className="hidden md:block" />
          <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent">
            lowkey sus
          </span> 👀
        </h1>

        <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-12">
          Find out if you're getting played, if they're about to ghost you, or if you're being a simp. 
          Chatlyzer uses AI to analyze your conversations and give you the real tea ☕
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-16">
          <Link
            href="/auth/sign-in"
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium px-8 py-3 rounded-full flex items-center gap-2 transition-all duration-200 hover:scale-105 w-full md:w-auto justify-center"
          >
            Expose my texts 💀
          </Link>

          <Link
            href="#"
            className="bg-white/10 hover:bg-white/20 text-white font-medium px-8 py-3 rounded-full flex items-center gap-2 transition w-full md:w-auto justify-center border border-purple-400/30 backdrop-blur-sm"
          >
            Watch the chaos 🍿
          </Link>
        </div>

        {/* Analysis Types */}
        <div id="analyses" className="mt-24">
          <h2 className="text-3xl font-bold mb-4">The Analysis Menu 📋</h2>
          <p className="text-gray-400 mb-12">Pick your poison - each one hits different 💯</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white/5 border border-purple-400/20 rounded-xl p-6 hover:bg-white/10 transition-all duration-200 hover:scale-105">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-medium mb-2">🚩 Red Flag Detector</h3>
              <p className="text-gray-400 text-sm">Spots the toxic behavior before you catch feelings</p>
            </div>
            
            <div className="bg-white/5 border border-purple-400/20 rounded-xl p-6 hover:bg-white/10 transition-all duration-200 hover:scale-105">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <h3 className="text-lg font-medium mb-2">✅ Green Flag Spotter</h3>
              <p className="text-gray-400 text-sm">When they're actually worth your time (rare)</p>
            </div>
            
            <div className="bg-white/5 border border-purple-400/20 rounded-xl p-6 hover:bg-white/10 transition-all duration-200 hover:scale-105">
              <div className="w-12 h-12 bg-pink-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Heart className="w-6 h-6 text-pink-500" />
              </div>
              <h3 className="text-lg font-medium mb-2">💕 Simp-O-Meter</h3>
              <p className="text-gray-400 text-sm">Measures how down bad you really are</p>
            </div>
            
            <div className="bg-white/5 border border-purple-400/20 rounded-xl p-6 hover:bg-white/10 transition-all duration-200 hover:scale-105">
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Ghost className="w-6 h-6 text-purple-500" />
              </div>
              <h3 className="text-lg font-medium mb-2">👻 Ghost Risk</h3>
              <p className="text-gray-400 text-sm">Predicts when you're about to get left on read</p>
            </div>

            <div className="bg-white/5 border border-purple-400/20 rounded-xl p-6 hover:bg-white/10 transition-all duration-200 hover:scale-105">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Star className="w-6 h-6 text-yellow-500" />
              </div>
              <h3 className="text-lg font-medium mb-2">⭐ Main Character Energy</h3>
              <p className="text-gray-400 text-sm">See who's serving drama and personality</p>
            </div>
            
            <div className="bg-white/5 border border-purple-400/20 rounded-xl p-6 hover:bg-white/10 transition-all duration-200 hover:scale-105">
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Brain className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="text-lg font-medium mb-2">💙 Emotional Depth</h3>
              <p className="text-gray-400 text-sm">Rates how real your conversations get</p>
            </div>
            
            <div className="bg-white/5 border border-purple-400/20 rounded-xl p-6 hover:bg-white/10 transition-all duration-200 hover:scale-105">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Zap className="w-6 h-6 text-cyan-500" />
              </div>
              <h3 className="text-lg font-medium mb-2">🔮 Vibe Check</h3>
              <p className="text-gray-400 text-sm">Overall energy and mood analysis</p>
            </div>
            
            <div className="bg-white/5 border border-purple-400/20 rounded-xl p-6 hover:bg-white/10 transition-all duration-200 hover:scale-105">
              <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                <MessageCircle className="w-6 h-6 text-orange-500" />
              </div>
              <h3 className="text-lg font-medium mb-2">📊 Chat Stats</h3>
              <p className="text-gray-400 text-sm">Who texts more, emoji usage, response times</p>
            </div>
          </div>
        </div>

        {/* Supported Platforms */}
        <div id="platforms" className="mt-24">
          <h2 className="text-3xl font-bold mb-4">Works With Your Fave Apps 📱</h2>
          <p className="text-gray-400 mb-12">Upload your chats from anywhere and get the tea</p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white/5 border border-purple-400/20 rounded-xl p-6 hover:bg-white/10 transition-all duration-200 hover:scale-105">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                <MessageCircle className="w-6 h-6 text-green-500" />
              </div>
              <h3 className="text-lg font-medium">WhatsApp</h3>
              <p className="text-gray-400 text-sm">Export & analyze</p>
            </div>
            
            <div className="bg-white/5 border border-purple-400/20 rounded-xl p-6 hover:bg-white/10 transition-all duration-200 hover:scale-105">
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Send className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="text-lg font-medium">Telegram</h3>
              <p className="text-gray-400 text-sm">Manual input</p>
            </div>
            
            <div className="bg-white/5 border border-purple-400/20 rounded-xl p-6 hover:bg-white/10 transition-all duration-200 hover:scale-105">
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                <MessageCircle className="w-6 h-6 text-purple-500" />
              </div>
              <h3 className="text-lg font-medium">Discord</h3>
              <p className="text-gray-400 text-sm">Manual input</p>
            </div>
            
            <div className="bg-white/5 border border-purple-400/20 rounded-xl p-6 hover:bg-white/10 transition-all duration-200 hover:scale-105">
              <div className="w-12 h-12 bg-gray-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                <MessageCircle className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium">Any Chat</h3>
              <p className="text-gray-400 text-sm">Copy & paste</p>
            </div>
          </div>
        </div>

        {/* Key Features */}
        <div id="features" className="mt-24">
          <h2 className="text-3xl font-bold mb-16">Why You Need This In Your Life</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="text-left">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4">
                <span className="font-bold">1</span>
              </div>
              <h3 className="text-xl font-medium mb-3">No More Guessing Games</h3>
              <p className="text-gray-400">Stop overthinking every text. Get AI-powered insights into what's really happening</p>
            </div>
            
            <div className="text-left">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4">
                <span className="font-bold">2</span>
              </div>
              <h3 className="text-xl font-medium mb-3">Catch Red Flags Early</h3>
              <p className="text-gray-400">Spot toxic patterns before you waste your time and energy</p>
            </div>
            
            <div className="text-left">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4">
                <span className="font-bold">3</span>
              </div>
              <h3 className="text-xl font-medium mb-3">Your Data Stays Private</h3>
              <p className="text-gray-400">We analyze, you get insights, nobody else sees your business</p>
            </div>
          </div>
        </div>

        {/* Testimonial */}
        <div className="mt-24 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl p-12 border border-purple-400/20 backdrop-blur-sm">
          <blockquote className="text-2xl font-light italic mb-6">
            "Bro this app literally saved me from getting played 💀 The ghost risk analysis was spot on - they left me on read the next day"
          </blockquote>
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <span className="text-sm font-bold">AJ</span>
            </div>
            <div>
              <div className="font-medium">@alexj_02</div>
              <div className="text-sm text-gray-400">College Student, Age 19</div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-24 mb-20">
          <h2 className="text-3xl font-bold mb-6">Ready to expose your texts? 👀</h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            Join the thousands who've discovered the truth about their conversations. It's giving main character energy ✨
          </p>
          <Link
            href="/auth/sign-in"
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium px-10 py-4 rounded-full inline-block transition-all duration-200 hover:scale-105"
          >
            Let's get this tea ☕
          </Link>
          <p className="text-sm text-gray-500 mt-4">No cap, it's actually free to try. No credit card needed 💯</p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-6 md:mb-0">
              <Image src="/favicon.ico" alt="Chatlyzer" width={32} height={32} className="w-8 h-8" />
              <span className="font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Chatlyzer
              </span>
            </div>
            
            <div className="flex flex-wrap gap-8 justify-center mb-6 md:mb-0">
              <Link href="https://www.termsfeed.com/live/b3b472ab-140f-4d73-b570-cbf17b3b7aeb" className="text-gray-400 hover:text-white transition">Privacy</Link>
              <Link href="/contact" className="text-gray-400 hover:text-white transition">Contact</Link>
              <Link href="/delete-account" className="text-gray-400 hover:text-white transition">Delete Account</Link>
            </div>
            
            <div className="text-gray-400 text-sm">
              © 2025 Chatlyzer. It's giving legitimate business ✨
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
