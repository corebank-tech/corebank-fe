import { cn } from "@/shared/lib/utils"

export const Skeleton = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-skeleton", className)}
      {...props}
    />
  )
}
