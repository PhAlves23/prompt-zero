"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { PlaygroundCompareResultItem } from "@/lib/api/types"
import { cn } from "@/lib/utils"

function tryFormatJson(text: string): string | null {
  try {
    const parsed = JSON.parse(text)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return null
  }
}

type PlaygroundResultCardProps = {
  result: PlaygroundCompareResultItem
  index: number
  promptId: string
  labels: {
    ok: string
    err: string
    provider: string
    tokensIn: string
    tokensOut: string
    tokensTotal: string
    latency: string
    cost: string
    execution: string
    pricing: string
    openPrompt: string
  }
  lang: string
}

export function PlaygroundResultCard({ result, index, promptId, labels, lang }: PlaygroundResultCardProps) {
  const body = result.ok ? result.output : result.error
  const jsonFormatted = result.ok && body ? tryFormatJson(body) : null
  const display = jsonFormatted ?? body ?? ""

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">
            #{index + 1} · {result.model}
          </CardTitle>
          <Badge variant={result.ok ? "default" : "destructive"}>{result.ok ? labels.ok : labels.err}</Badge>
          {result.provider ? (
            <Badge variant="outline" className="font-normal">
              {labels.provider}: {result.provider}
            </Badge>
          ) : null}
        </div>
        {result.ok ? (
          <dl className="text-muted-foreground grid gap-1 text-xs sm:grid-cols-2">
            <div>
              <dt className="inline font-medium">{labels.tokensIn}: </dt>
              <dd className="inline">{result.meta.inputTokens}</dd>
            </div>
            <div>
              <dt className="inline font-medium">{labels.tokensOut}: </dt>
              <dd className="inline">{result.meta.outputTokens}</dd>
            </div>
            <div>
              <dt className="inline font-medium">{labels.tokensTotal}: </dt>
              <dd className="inline">{result.meta.totalTokens}</dd>
            </div>
            <div>
              <dt className="inline font-medium">{labels.latency}: </dt>
              <dd className="inline">{result.meta.latencyMs} ms</dd>
            </div>
            <div>
              <dt className="inline font-medium">{labels.cost}: </dt>
              <dd className="inline">{result.meta.estimatedCost.toFixed(6)}</dd>
            </div>
            <div>
              <dt className="inline font-medium">{labels.pricing}: </dt>
              <dd className="inline truncate">{result.meta.pricingSource}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="inline font-medium">{labels.execution}: </dt>
              <dd className="inline font-mono text-xs break-all">{result.executionId}</dd>
            </div>
            {promptId ? (
              <div className="sm:col-span-2">
                <Link
                  href={`/${lang}/prompts/${promptId}`}
                  className="text-primary text-xs underline-offset-4 hover:underline"
                >
                  {labels.openPrompt}
                </Link>
              </div>
            ) : null}
          </dl>
        ) : null}
      </CardHeader>
      <CardContent>
        <pre
          className={cn(
            "max-h-[360px] overflow-auto rounded-md border bg-muted/50 p-3 text-xs whitespace-pre-wrap",
            jsonFormatted && "font-mono",
          )}
        >
          {display}
        </pre>
      </CardContent>
    </Card>
  )
}
