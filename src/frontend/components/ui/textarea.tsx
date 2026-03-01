import * as React from "react"

import { cn } from "@/shared/utils/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "placeholder:text-muted-foreground flex field-sizing-content min-h-20 w-full rounded-none border-2 border-primary bg-card px-3 py-2 font-mono text-base text-card-foreground shadow-brutal-sm transition-none outline-none focus-visible:ring-0 focus-visible:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
