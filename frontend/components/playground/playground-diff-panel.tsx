"use client"

import { useMemo, useState } from "react"
import { simpleLineDiff } from "@/lib/text-diff"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

type PlaygroundDiffPanelProps = {
  leftLabel: string
  rightLabel: string
  leftText: string
  rightText: string
  title: string
}

export function PlaygroundDiffPanel({ leftLabel, rightLabel, leftText, rightText, title }: PlaygroundDiffPanelProps) {
  const lines = useMemo(() => simpleLineDiff(leftText, rightText), [leftText, rightText])
  const [open, setOpen] = useState(false)

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="min-w-0 max-w-full">
      <CollapsibleTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="w-full min-w-0 justify-between">
          <span>{title}</span>
          <HugeiconsIcon icon={open ? ArrowUp01Icon : ArrowDown01Icon} className="size-4" strokeWidth={2} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 min-w-0 max-w-full">
        <div className="text-muted-foreground mb-2 flex flex-wrap gap-4 text-xs">
          <span>
            <span className="font-medium">{leftLabel}</span>
          </span>
          <span>
            <span className="font-medium">{rightLabel}</span>
          </span>
        </div>
        <pre className="max-h-64 w-full min-w-0 max-w-full overflow-auto rounded-md border bg-muted/40 p-2 font-mono text-xs whitespace-pre-wrap wrap-break-word">
          {lines.map((line, i) => (
            <div
              key={i}
              className={cn(
                "wrap-break-word",
                line.type === "add" && "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
                line.type === "remove" && "bg-red-500/15 text-red-800 dark:text-red-200",
                line.type === "same" && "text-foreground/90",
              )}
            >
              {line.type === "add" ? "+ " : line.type === "remove" ? "- " : "  "}
              {line.text}
            </div>
          ))}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  )
}
