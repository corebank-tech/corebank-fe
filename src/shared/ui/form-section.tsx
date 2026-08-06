import * as React from "react"
import { cn } from "@/shared/lib/utils"

type FormSectionProps = Omit<React.HTMLAttributes<HTMLElement>, "title"> & {
  title: React.ReactNode
  action?: React.ReactNode
}

export const FormSection = ({
  title,
  action,
  className,
  children,
  ...props
}: FormSectionProps) => {
  return (
    <section className={cn("mb-8", className)} {...props}>
      <div className="flex items-end justify-between border-b-2 border-navy pb-2">
        <h2 className="text-h2 font-bold text-ink">{title}</h2>
        {action != null && (
          <div className="flex items-center gap-2">{action}</div>
        )}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}
