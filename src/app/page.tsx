import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Instagram, MessageCircle, Send, Twitter } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen text-white">
      {/* Navigation */}
      <header className="container mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image src="/favicon.ico" alt="Chatlyzer" width={32} height={32} className="w-8 h-8" />
          <span className="font-medium text-lg">Chatlyzer</span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          <Link href="#features" className="text-gray-300 hover:text-white transition">
            Features
          </Link>
          <Link href="#platforms" className="text-gray-300 hover:text-white transition">
            Platforms
          </Link>
          <Link href="#pricing" className="text-gray-300 hover:text-white transition">
            Pricing
          </Link>
          <Link href="#" className="text-gray-300 hover:text-white transition flex items-center gap-2">
            Blog
            <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">NEW</span>
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/auth/sign-in" className="text-gray-300 hover:text-white transition">
            Login
          </Link>
          <Link
            href="/auth/sign-in"
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-6 py-2 rounded-full transition"
          >
            Try for free
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 mt-16 text-center">
        <div className="inline-flex items-center gap-2 text-gray-300 bg-white/10 rounded-full px-4 py-2 mb-6">
          <span>New: Multi-platform Analytics</span>
          <Link href="#" className="text-blue-300 hover:text-blue-200 flex items-center gap-1 transition">
            Learn more <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
          Analyze Your Chat Conversations <br className="hidden md:block" />
          <span className="text-blue-500">with AI</span>
        </h1>

        <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-12">
          Chatlyzer helps you gain valuable insights from your conversations across Instagram, 
          WhatsApp, Telegram, and X. Understand sentiment, patterns, and engagement like never before.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-16">
          <Link
            href="/auth/sign-in"
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-8 py-3 rounded-full flex items-center gap-2 transition w-full md:w-auto justify-center"
          >
            Start analyzing for free
          </Link>

          <Link
            href="#"
            className="bg-white/10 hover:bg-white/20 text-white font-medium px-8 py-3 rounded-full flex items-center gap-2 transition w-full md:w-auto justify-center border border-blue-400/30"
          >
            Watch demo
          </Link>
        </div>

        {/* Supported Platforms */}
        <div id="platforms" className="mt-24">
          <h2 className="text-3xl font-bold mb-12">Analyze Conversations Across All Major Platforms</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white/5 border border-blue-400/20 rounded-xl p-6 hover:bg-white/10 transition">
              <div className="w-12 h-12 bg-pink-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Instagram className="w-6 h-6 text-pink-500" />
              </div>
              <h3 className="text-xl font-medium mb-2">Instagram</h3>
              <p className="text-gray-400">Analyze DMs and comments to understand engagement patterns</p>
            </div>
            
            <div className="bg-white/5 border border-blue-400/20 rounded-xl p-6 hover:bg-white/10 transition">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                <MessageCircle className="w-6 h-6 text-green-500" />
              </div>
              <h3 className="text-xl font-medium mb-2">WhatsApp</h3>
              <p className="text-gray-400">Import and analyze group and private conversations</p>
            </div>
            
            <div className="bg-white/5 border border-blue-400/20 rounded-xl p-6 hover:bg-white/10 transition">
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Send className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="text-xl font-medium mb-2">Telegram</h3>
              <p className="text-gray-400">Deep insights into channel and group communication</p>
            </div>
            
            <div className="bg-white/5 border border-blue-400/20 rounded-xl p-6 hover:bg-white/10 transition">
              <div className="w-12 h-12 bg-blue-400/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Twitter className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="text-xl font-medium mb-2">X (Twitter)</h3>
              <p className="text-gray-400">Track conversations, threads, and DMs for sentiment analysis</p>
            </div>
          </div>
        </div>

        {/* Key Features */}
        <div id="features" className="mt-24">
          <h2 className="text-3xl font-bold mb-16">What Chatlyzer Can Do For You</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="text-left">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mb-4">
                <span className="font-bold">1</span>
              </div>
              <h3 className="text-xl font-medium mb-3">Sentiment Analysis</h3>
              <p className="text-gray-400">Understand the emotional tone behind conversations with AI-powered sentiment detection</p>
            </div>
            
            <div className="text-left">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mb-4">
                <span className="font-bold">2</span>
              </div>
              <h3 className="text-xl font-medium mb-3">Conversation Patterns</h3>
              <p className="text-gray-400">Identify communication patterns and gain insights into response times and engagement</p>
            </div>
            
            <div className="text-left">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mb-4">
                <span className="font-bold">3</span>
              </div>
              <h3 className="text-xl font-medium mb-3">Anonymized Insights</h3>
              <p className="text-gray-400">Privacy-first approach with complete data anonymization and end-to-end encryption</p>
            </div>
          </div>
        </div>

        {/* Testimonial */}
        <div className="mt-24 bg-blue-500/5 rounded-2xl p-12 border border-blue-400/20">
          <blockquote className="text-2xl font-light italic mb-6">
            "Chatlyzer transformed how I understand my audience. The insights from my Instagram DMs alone have been invaluable for my business."
          </blockquote>
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full overflow-hidden">
              <Image
                src="/placeholder.svg?height=40&width=40"
                alt="Customer"
                width={40}
                height={40}
              />
            </div>
            <div>
              <div className="font-medium">Sarah Johnson</div>
              <div className="text-sm text-gray-400">Digital Marketer @ Brand Co.</div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-24 mb-20">
          <h2 className="text-3xl font-bold mb-6">Ready to decode your conversations?</h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            Join thousands of users who've discovered hidden insights in their everyday conversations.
          </p>
          <Link
            href="/auth/sign-in"
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-10 py-4 rounded-full inline-block transition"
          >
            Get started for free
          </Link>
          <p className="text-sm text-gray-500 mt-4">No credit card required. 14-day free trial.</p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-6 md:mb-0">
              <Image src="/favicon.ico" alt="Chatlyzer" width={32} height={32} className="w-8 h-8" />
              <span className="font-medium">Chatlyzer</span>
            </div>
            
            <div className="flex flex-wrap gap-8 justify-center mb-6 md:mb-0">
              <Link href="#" className="text-gray-400 hover:text-white transition">Terms</Link>
              <Link href="#" className="text-gray-400 hover:text-white transition">Privacy</Link>
              <Link href="#" className="text-gray-400 hover:text-white transition">Help</Link>
              <Link href="#" className="text-gray-400 hover:text-white transition">Contact</Link>
            </div>
            
            <div className="text-gray-400 text-sm">
              © 2023 Chatlyzer. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
