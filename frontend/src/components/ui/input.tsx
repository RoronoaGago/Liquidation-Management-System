import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "tw-border-neutral-200 file:tw-text-neutral-950 placeholder:tw-text-neutral-500 selection:tw-bg-neutral-900 selection:tw-text-neutral-50 tw-flex tw-h-9 tw-w-full tw-min-w-0 tw-rounded-md tw-border tw-bg-transparent tw-px-3 tw-py-1 tw-text-base tw-shadow-xs tw-transition-[color,box-shadow] tw-outline-none file:tw-inline-flex file:tw-h-7 file:tw-border-0 file:tw-bg-transparent file:tw-text-sm file:tw-font-medium disabled:tw-pointer-events-none disabled:tw-cursor-not-allowed disabled:tw-opacity-50 md:tw-text-sm dark:tw-border-neutral-800 dark:file:tw-text-neutral-50 dark:placeholder:tw-text-neutral-400 dark:selection:tw-bg-neutral-50 dark:selection:tw-text-neutral-900",
        "focus-visible:tw-border-neutral-950 focus-visible:tw-ring-neutral-950/50 focus-visible:tw-ring-[3px] dark:focus-visible:tw-border-neutral-300 dark:focus-visible:tw-ring-neutral-300/50",
        "aria-invalid:tw-ring-red-500/20 dark:aria-invalid:tw-ring-red-500/40 aria-invalid:tw-border-red-500 dark:aria-invalid:tw-ring-red-900/20 dark:dark:aria-invalid:tw-ring-red-900/40 dark:aria-invalid:tw-border-red-900",
        className
      )}
      {...props}
    />
  )
}

export { Input }
