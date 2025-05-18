"use client"

import { LoginForm } from "@/components/login-form"
import useAuth from "@/hooks/useAuth";
import posthog from "posthog-js";

export default function LoginPage() {
  const { signIn, isLoggingIn } = useAuth();

  return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <LoginForm onSignIn={() => {
            signIn();
            posthog.capture("sign_in", {property: "value"});
          }} isLoading={isLoggingIn} />
        </div>
      </div>
  )
}
