import * as React from "react"

import { cn } from "@/lib/utils"

type BrandMarkProps = React.ComponentProps<"span">

export function BrandMark({
  className,
  "aria-hidden": ariaHidden = true,
  ...props
}: BrandMarkProps) {
  return (
    <span
      className={cn("flex shrink-0 items-center justify-center", className)}
      aria-hidden={ariaHidden}
      {...props}
    >
      <svg
        className="block dark:hidden"
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="48" height="48" rx="10" fill="#000000" />
        <text
          x="50%"
          y="50%"
          dy="-0.04em"
          textAnchor="middle"
          dominantBaseline="central"
          fill="#BFFF0A"
          fontSize="32"
          fontWeight="700"
          fontFamily="'Space Mono', monospace"
        >
          0
        </text>
      </svg>

      <svg
        className="hidden dark:block"
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="48" height="48" rx="10" fill="#BFFF0A" />
        <text
          x="50%"
          y="50%"
          dy="-0.04em"
          textAnchor="middle"
          dominantBaseline="central"
          fill="#000000"
          fontSize="32"
          fontWeight="700"
          fontFamily="'Space Mono', monospace"
        >
          0
        </text>
      </svg>
    </span>
  )
}
