"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface LoginFormProps {
  onSignIn: () => void;
  title?: string;
  description?: string;
  buttonText?: string;
  isLoading?: boolean;
}

export function LoginForm({
  onSignIn,
  title = "Welcome",
  description = "Continue with Google to sign in or create an account",
  buttonText = "Continue with Google",
  isLoading = false
}: LoginFormProps) {

  const handleSignIn = () => {
    onSignIn();
  }

  return (
    <div className="flex flex-col items-center space-y-8 w-full max-w-md mx-auto">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white">Sign in to your account</h1>
        <p className="text-xl text-gray-400 mt-2">New users will be registered automatically</p>
      </div>
      
      <Card className="w-full border-[1px] border-gray-500 bg-black/60 backdrop-blur-sm rounded-xl shadow-lg shadow-indigo-500/5">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-white">{title}</CardTitle>
          <CardDescription className="text-gray-400 text-lg">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <button
            className="w-full flex items-center justify-center bg-black border-[1.5px] border-blue-500 text-white hover:bg-black-900 hover:border-blue-400 transition-all duration-200 h-16 rounded-lg shadow-sm"
            onClick={handleSignIn}
            disabled={isLoading}
          >
            <div className="relative flex items-center justify-center w-full">
              <div className={`flex items-center justify-center transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
                <svg viewBox="0 0 24 24" width="24" height="24" className="mr-3">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="text-lg font-medium">{buttonText}</span>
              </div>
              <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${isLoading ? 'opacity-100' : 'opacity-0'}`}>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-lg font-medium">Redirecting...</span>
              </div>
            </div>
          </button>
        </CardContent>
      </Card>
    </div>
  )
}
