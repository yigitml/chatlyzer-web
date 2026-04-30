"use client"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { ArrowRight, Zap, Heart, Brain, Ghost, Star, AlertTriangle, CheckCircle, MessageCircle, Send } from "lucide-react"
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
    <div className="min-h-screen text-foreground bg-background relative overflow-hidden flex flex-col selection:bg-primary selection:text-primary-foreground">
      
      {/* Navigation */}
      <header className="border-b-4 border-primary bg-background py-4 px-4 md:px-8 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Image src="/iconsvg.svg" alt="Chatlyzer" width={32} height={32} className="w-8 h-8 rounded-none border-2 border-primary shadow-[4px_4px_0px_0px_hsl(var(--primary))] bg-card p-0.5" />
          <span className="font-display font-black text-2xl tracking-widest uppercase">Chatlyzer</span>
        </div>

        <nav className="hidden md:flex items-center gap-8 font-mono uppercase font-bold text-sm tracking-widest">
          <Link href="#features" className="hover:line-through transition-all">Features</Link>
          <Link href="#analyses" className="hover:line-through transition-all">Analyses</Link>
          <Link href="/contact" className="hover:line-through transition-all">Contact</Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-4 font-mono uppercase font-bold text-xs sm:text-sm">
          <Link href="/auth/sign-in" className="hover:line-through transition-all hidden sm:block">Login</Link>
          <Link
            href="/auth/sign-in"
            className="border-2 border-primary bg-primary text-primary-foreground px-3 sm:px-6 py-1.5 sm:py-2 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_hsl(var(--primary))] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all whitespace-nowrap min-w-0"
          >
            Start Vibing //
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 container mx-auto px-4 mt-16 mb-20 text-center relative z-10 flex flex-col items-center">
        <div className="inline-flex items-center gap-2 border-2 border-primary bg-card text-card-foreground px-4 py-3 mb-12 shadow-[4px_4px_0px_0px_hsl(var(--primary))] font-mono uppercase text-sm font-bold rotate-[1deg]">
          <span className="text-destructive animate-pulse">🔥 NEW SYSTEM UPDATE</span>
          <span className="hidden sm:inline">:: SIMP-O-METER OVERRIDE INSTALLED</span>
          <Link href="#analyses" className="ml-2 underline flex items-center gap-1 hover:text-primary transition">
            SCAN NOW <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <h1 className="text-6xl md:text-[7rem] font-display font-black uppercase tracking-tighter mb-8 leading-[0.9] text-balance">
          YOUR CHATS ARE<br />
          <span className="relative inline-block mt-2 bg-primary text-primary-foreground px-6 py-2 border-4 border-primary shadow-[12px_12px_0px_0px_hsl(var(--foreground))] rotate-[-2deg] hover:rotate-[0deg] transition-transform duration-300">
            LOWKEY SUS
          </span>
        </h1>

        <p className="text-lg md:text-xl font-mono text-muted-foreground uppercase max-w-3xl mx-auto mb-16 tracking-widest leading-loose mt-12 bg-card border-2 border-primary p-6 shadow-[6px_6px_0px_0px_hsl(var(--primary))]">
          Run diagnostics to check if you're getting played, if they'll ghost you, or if you're a simp. Let the AI extract the raw, unfiltered truth.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch justify-center gap-6 mb-32 w-full max-w-md mx-auto">
          <Link
            href="/auth/sign-in"
            className="flex-1 w-full text-center border-4 border-primary bg-primary text-primary-foreground font-mono font-black uppercase tracking-widest text-lg px-8 py-5 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_hsl(var(--primary))] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all"
          >
            Expose My Texts //
          </Link>
        </div>

        {/* Analysis Types */}
        <div id="analyses" className="w-full mt-12 text-left relative">
          <div className="border-b-4 border-primary pb-4 mb-16 flex justify-between items-end">
            <h2 className="text-4xl md:text-6xl font-display font-black uppercase tracking-tight">The Payload_</h2>
            <p className="hidden md:block font-mono text-muted-foreground uppercase tracking-widest font-bold">// SELECT ANALYSIS VECTOR</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { id: '01', icon: AlertTriangle, color: 'text-destructive', title: 'Red Flag', desc: 'Spots toxic behavior before you fall for them', bg: 'bg-destructive/10 border-destructive' },
              { id: '02', icon: CheckCircle, color: 'text-green-500', title: 'Green Flag', desc: 'When they\'re actually worth your time (rare)', bg: 'bg-green-500/10 border-green-500' },
              { id: '03', icon: Heart, color: 'text-pink-500', title: 'BEN SENİ ASLINDA HİÇ SEVMEDİM', desc: 'Measures exactly how down bad you really are', bg: 'bg-pink-500/10 border-pink-500' },
              { id: '04', icon: Ghost, color: 'text-blue-500', title: 'Ghost Risk', desc: 'Predicts when you\'re about to get left on read', bg: 'bg-blue-500/10 border-blue-500' },
              { id: '05', icon: Star, color: 'text-yellow-500', title: 'Main Character', desc: 'See who\'s serving drama and personality', bg: 'bg-yellow-500/10 border-yellow-500' },
              { id: '06', icon: Brain, color: 'text-purple-500', title: 'Emotional Depth', desc: 'Rates how real your conversations actually get', bg: 'bg-purple-500/10 border-purple-500' },
              { id: '07', icon: Zap, color: 'text-cyan-500', title: 'Vibe Check', desc: 'Overall energy and mood frequency analysis', bg: 'bg-cyan-500/10 border-cyan-500' },
              { id: '08', icon: MessageCircle, color: 'text-orange-500', title: 'Chat Stats', desc: 'Who texts more, emoji usage, metric tracking', bg: 'bg-orange-500/10 border-orange-500' },
            ].map((feature, i) => (
              <div key={i} className={`bg-card border-4 border-primary p-6 hover:-translate-y-2 hover:-translate-x-2 hover:shadow-[10px_10px_0px_0px_hsl(var(--primary))] transition-all flex flex-col items-start group relative overflow-hidden bg-gradient-to-br from-card to-${feature.bg.split(' ')[0]} ${[1, 4, 6].includes(i) ? 'rotate-1 hover:rotate-0' : ''} ${[2, 5].includes(i) ? '-rotate-1 hover:rotate-0' : ''}`}>
                <div className={`w-14 h-14 border-4 border-primary ${feature.bg.split(' ')[0]} flex items-center justify-center mb-8 shadow-[4px_4px_0px_0px_hsl(var(--primary))] group-hover:-translate-y-1 transition-transform`}>
                  <feature.icon className={`w-7 h-7 ${feature.color}`} strokeWidth={3} />
                </div>
                <div className="font-mono text-sm font-black text-muted-foreground mb-3 tracking-widest">// ARCHIVE_{feature.id}</div>
                <h3 className="text-xl font-black font-display uppercase mb-4 text-foreground tracking-wide leading-tight">{feature.title}</h3>
                <p className="text-muted-foreground font-mono text-sm uppercase leading-relaxed font-bold">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Supported Platforms */}
        <div id="platforms" className="w-full mt-40 text-left">
           <div className="border-b-4 border-primary pb-4 mb-16 flex justify-between items-end">
            <h2 className="text-4xl md:text-6xl font-display font-black uppercase tracking-tight">Data Ingestion_</h2>
            <p className="hidden md:block font-mono text-muted-foreground uppercase tracking-widest font-bold">// PLATFORM COMPATIBILITY MAP</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: MessageCircle, color: 'text-green-500', title: 'WhatsApp', desc: 'Export TXT' },
              { icon: Send, color: 'text-blue-500', title: 'Telegram', desc: 'Manual Input' },
              { icon: MessageCircle, color: 'text-indigo-400', title: 'Discord', desc: 'Manual Input' },
              { icon: MessageCircle, color: 'text-muted-foreground', title: 'Raw Text', desc: 'Copy & Paste' },
            ].map((platform, i) => (
              <div key={i} className="bg-background border-4 border-primary p-8 text-center hover:-translate-y-2 hover:bg-card hover:shadow-[8px_8px_0px_0px_hsl(var(--primary))] transition-all flex flex-col items-center group">
                <platform.icon className={`w-10 h-10 ${platform.color} mb-6 group-hover:scale-110 transition-transform`} strokeWidth={2.5} />
                <h3 className="text-xl font-black font-display uppercase tracking-widest mb-3">{platform.title}</h3>
                <p className="text-muted-foreground font-mono text-xs uppercase font-bold tracking-widest">{platform.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Big CTA Component */}
        <div className="w-full mt-40 mb-10">
          <div className="bg-primary/5 border-8 border-primary p-12 md:p-24 shadow-[16px_16px_0px_0px_hsl(var(--primary))] relative overflow-hidden text-left sm:text-center flex flex-col items-center">
            
            <div className="relative z-10 w-full flex flex-col items-center">
              <h2 className="text-5xl md:text-[5rem] font-display font-black uppercase mb-8 leading-[0.9] text-primary">
                STOP GUESSING.<br/>START COMPILING.
              </h2>
              <p className="text-xl font-mono text-muted-foreground uppercase mb-16 max-w-2xl mx-auto tracking-widest leading-loose font-bold bg-background border-2 border-primary p-4 text-center">
                Join thousands running diagnostics on their relationships. No cap, it's actually free to try.
              </p>
              <Link
                href="/auth/sign-in"
                className="inline-block border-4 border-primary bg-primary text-primary-foreground font-mono font-black uppercase tracking-widest text-2xl px-16 py-8 hover:-translate-x-2 hover:-translate-y-2 hover:shadow-[12px_12px_0px_0px_hsl(var(--foreground))] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all w-full md:w-auto text-center"
              >
                Execute Analysis [ENTER]
              </Link>
            </div>
            {/* Background decorative elements */}
            <div className="absolute -top-10 -left-10 w-40 h-40 border-8 border-primary rounded-full opacity-20 pointer-events-none"></div>
            <div className="absolute -bottom-10 -right-10 w-60 h-60 border-8 border-primary rounded-none opacity-20 rotate-45 pointer-events-none"></div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-4 border-primary bg-background py-16 z-10 w-full mt-auto">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 border-b-2 border-primary pb-8 mb-8">
            <div className="flex items-center gap-4">
              <Image src="/iconsvg.svg" alt="Chatlyzer" width={48} height={48} className="w-12 h-12 border-2 border-primary bg-card p-1 shadow-[4px_4px_0px_0px_hsl(var(--primary))]" />
              <span className="font-display font-black text-3xl uppercase tracking-widest">
                Chatlyzer
              </span>
            </div>
            
            <div className="flex flex-col sm:flex-row flex-wrap gap-x-12 gap-y-4 text-center justify-center font-mono font-bold uppercase text-sm tracking-widest">
              <Link href="#" className="hover:line-through hover:text-primary transition">Privacy_Policy.txt</Link>
              <Link href="/contact" className="hover:line-through hover:text-primary transition">Contact_Us.exe</Link>
              <Link href="/delete-account" className="hover:line-through text-destructive transition">Purge_Data.sh</Link>
            </div>
          </div>
          
          <div className="flex justify-between items-center w-full font-mono uppercase text-xs font-bold tracking-widest text-muted-foreground group">
            <span>© 2025 // SYSTEM.OPERATIONAL</span>
            <span className="hidden sm:inline opacity-0 group-hover:opacity-100 transition-opacity">BUILD VERSION 1.0.0-RC</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
