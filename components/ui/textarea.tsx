import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // min-w-0 + overflow-wrap:anywhere: field-sizing-content derives the
        // intrinsic width from the LONGEST UNBREAKABLE WORD, which lets one
        // long paste stretch the textarea (and its flex ancestors) past the
        // dialog edge. Breaking anywhere caps the min width at one character.
        "flex field-sizing-content min-h-16 w-full min-w-0 [overflow-wrap:anywhere] resize-none rounded-xl border border-input bg-input/30 px-3 py-3 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 md:text-sm dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
