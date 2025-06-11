import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("tw-bg-neutral-100 tw-animate-pulse tw-rounded-md dark:tw-bg-neutral-800", className)}
      {...props}
    />
  )
}

export { Skeleton }
