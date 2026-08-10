"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

interface ProgressProps extends React.ComponentProps<typeof ProgressPrimitive.Root> {
  indicatorClassName?: string
  indicatorStyle?: React.CSSProperties
}

function Progress({
  className,
  value,
  indicatorClassName,
  indicatorStyle,
  ...props
}: ProgressProps) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "bg-primary/20 relative h-2 w-full overflow-hidden rounded-full",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          "bg-primary h-full w-full flex-1 -translate-x-(--progress-remaining) transition-all rtl:translate-x-(--progress-remaining)",
          indicatorClassName
        )}
        style={{
          "--progress-remaining": `${100 - (value || 0)}%`,
          ...indicatorStyle
        } as React.CSSProperties}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
