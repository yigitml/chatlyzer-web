"use client"

import { LoginForm } from "@/frontend/components/login-form"
import useAuth from "@/frontend/hooks/useAuth";

export default function LoginPage() {
  const { signIn, isLoggingIn } = useAuth();

  return (
    <div className="min-h-screen text-white bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">
            Welcome back ✨
          </h1>
          <p className="text-sm text-gray-300">
            Ready to get the tea on your conversations? Let's dive in 🍵
          </p>
        </div>

        <LoginForm 
          compact
          onSignIn={signIn} 
          isLoading={isLoggingIn}
          buttonText="Continue with Google"
        />
      </div>
    </div>
  )
}
