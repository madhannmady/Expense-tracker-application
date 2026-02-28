import { cn } from "../../lib/utils"

function Skeleton({
  className,
  ...props
}) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted/20 border border-white/5", className)}
      {...props}
    />
  )
}

export { Skeleton }
