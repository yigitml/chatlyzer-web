'use client'

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { useState } from "react"

export default function SignIn() {
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <Button
        type="button"
        className={cn(
          "flex items-center justify-center gap-2 rounded-lg"
        )}
      >
      <div className="w-5 h-5 relative flex-shrink-0">
        <Image
          src="/images/google_icon.png"
          width={20}
          height={20}
          alt="Google"
          className="object-contain"
          priority
        />
      </div>
    </Button>
    <p>Sign in with Google</p>
    </div>
  )
}