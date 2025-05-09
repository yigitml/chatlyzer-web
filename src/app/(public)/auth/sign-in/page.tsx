import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-white">Sign in to your account</h1>
            <p className="mt-2 text-sm text-gray-300">
              Or{" "}
              <a href="#" className="font-medium text-white hover:underline">
                create a new account
              </a>
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
  )
}
