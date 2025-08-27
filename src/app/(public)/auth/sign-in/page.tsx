"use client"

import { LoginForm } from "@/frontend/components/login-form"
import useAuth from "@/frontend/hooks/useAuth";
import posthog from "posthog-js";
import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  const { signIn, isLoggingIn } = useAuth();

  return (
    <div className="min-h-screen text-white bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">
            Welcome back
            <span className="relative inline-block text-white after:content-[''] after:block after:h-0.5 after:w-full after:bg-gradient-to-r from-blue-400/40 to-cyan-400/40 after:mt-1 after:rounded-full"> bestie</span> ✨
          </h1>
          <p className="text-sm text-gray-300">
            Ready to get the tea on your conversations? Let's dive in 🍵
          </p>
        </div>

        <LoginForm 
          compact
          onSignIn={() => {
            signIn();
            posthog.capture("sign_in", { property: "value" });
          }} 
          isLoading={isLoggingIn}
          buttonText="Continue with Google"
        />
      </div>
    </div>
  )
}
