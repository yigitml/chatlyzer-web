import * as React from "react"

import { cn } from "@/shared/utils/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-10 w-full min-w-0 rounded-none border-2 border-primary bg-card px-3 py-1 font-mono text-base text-card-foreground shadow-brutal-sm transition-none outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:ring-0 focus-visible:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none",
        "aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
