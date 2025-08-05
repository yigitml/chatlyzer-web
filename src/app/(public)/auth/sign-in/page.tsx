"use client"

import { LoginForm } from "@/frontend/components/login-form"
import useAuth from "@/frontend/hooks/useAuth";
import posthog from "posthog-js";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Sparkles, Zap } from "lucide-react";

export default function LoginPage() {
  const { signIn, isLoggingIn } = useAuth();

  return (
    <div className="min-h-screen text-white bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900">
      {/* Navigation */}
      <header className="container mx-auto px-4 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/favicon.ico" alt="Chatlyzer" width={32} height={32} className="w-8 h-8" />
          <span className="font-bold text-xl bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Chatlyzer
          </span>
        </Link>

        <Link
          href="/"
          className="flex items-center gap-2 text-gray-300 hover:text-white transition-all duration-200 hover:scale-105"
        >
          <ArrowLeft className="h-4 w-4" />
          Back Home
        </Link>
      </header>

      <div className="flex min-h-[calc(100vh-120px)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          {/* Hero Section */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-blue-300 bg-white/10 rounded-full px-4 py-2 mb-6 backdrop-blur-sm">
              <Zap className="w-4 h-4" />
              <span>Time to expose those texts ⚡</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Welcome back
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-red-400 bg-clip-text text-transparent">
                bestie
              </span> ✨
            </h1>
            
            <p className="text-lg text-gray-300 mb-8">
              Ready to get the tea on your conversations? Let's dive in 🍵
            </p>
          </div>

          {/* Login Form Container */}
          <div className="bg-white/5 backdrop-blur-sm border border-blue-400/20 rounded-2xl p-8 shadow-2xl">
            <LoginForm 
              onSignIn={() => {
                signIn();
                posthog.capture("sign_in", {property: "value"});
              }} 
              isLoading={isLoggingIn} 
            />
          </div>

          {/* Additional Info */}
          <div className="text-center space-y-4">
            <p className="text-sm text-gray-400">
              New here? No worries, signing in creates your account automatically 💫
            </p>
            
            <div className="flex items-center justify-center gap-6 text-xs text-gray-500">
              <span>🔒 Secure & Private</span>
              <span>⚡ Lightning Fast</span>
              <span>✨ Actually Free</span>
            </div>
          </div>

          {/* Fun Stats */}
          <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl p-6 border border-blue-400/20 backdrop-blur-sm">
            <div className="text-center">
              <p className="text-sm text-blue-300 mb-3">
                Join thousands who've discovered the truth 👀
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-lg font-bold text-white">50K+</div>
                  <div className="text-xs text-gray-400">Chats analyzed</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-white">12K+</div>
                  <div className="text-xs text-gray-400">Red flags caught</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-white">8K+</div>
                  <div className="text-xs text-gray-400">Hearts saved</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
