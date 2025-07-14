"use client";

import { ErrorBoundary } from "react-error-boundary";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react"; 
import { StoreProvider } from "@/providers/StoreProvider";
import { PostHogProvider } from "./PostHogProvider";

interface ProvidersProps {
  children: React.ReactNode;
}

function RootErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  const router = useRouter();

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-black border border-gray-700 rounded-lg p-6 max-w-md w-full space-y-6 text-center">
        <div className="h-12 w-12 mx-auto text-red-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white">
          Oops! Something went wrong
        </h2>
        <p className="text-gray-400">
          We're sorry, but we've encountered an unexpected error.
        </p>
        <div className="space-y-2">
          <button
            onClick={resetErrorBoundary}
            className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition duration-200"
          >
            Try Again
          </button>
          <button
            onClick={() => router.push("/")}
            className="w-full px-4 py-2 bg-black hover:bg-black text-white rounded transition duration-200"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Providers({ children }: ProvidersProps) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;

  return (
    <PostHogProvider>
      <ErrorBoundary FallbackComponent={RootErrorFallback}>
        <GoogleOAuthProvider clientId={googleClientId}>
            <NextThemesProvider
              attribute="class"
              defaultTheme="dark"
              enableSystem={true}
              enableColorScheme
            >
              <StoreProvider>
                {children}
              </StoreProvider>
            </NextThemesProvider>
        </GoogleOAuthProvider>
      </ErrorBoundary>
    </PostHogProvider>
  );
}
