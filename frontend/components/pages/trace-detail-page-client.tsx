"use client"

import type { ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { bffFetch } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/query-keys"
import type { TraceRunDetail } from "@/lib/api/types"
import type { Dictionary } from "@/app/[lang]/dictionaries"
import { formatDateTimeLocale } from "@/lib/format-datetime"

function SpanRow({ span, lang, depth }: { span: TraceRunDetail["spans"][0]; lang: string; depth: number }) {
  return (
    <div style={{ paddingLeft: depth * 12 }} className="border-l border-border py-1 text-sm">
      <div className="font-medium">{span.name}</div>
      <div className="text-xs text-muted-foreground">
        {formatDateTimeLocale(span.startTime, lang)}
        {span.endTime ? ` → ${formatDateTimeLocale(span.endTime, lang)}` : ""}
      </div>
    </div>
  )
}

function buildTree(spans: TraceRunDetail["spans"]) {
  const byParent = new Map<string | null, TraceRunDetail["spans"]>()
  for (const s of spans) {
    const p = s.parentId
    const list = byParent.get(p) ?? []
    list.push(s)
    byParent.set(p, list)
  }
  return byParent
}

function renderSpans(
  byParent: Map<string | null, TraceRunDetail["spans"]>,
  parentId: string | null,
  lang: string,
  depth: number,
): ReactNode[] {
  const children = byParent.get(parentId) ?? []
  return children.flatMap((span) => [
    <SpanRow key={span.id} span={span} lang={lang} depth={depth} />,
    ...renderSpans(byParent, span.id, lang, depth + 1),
  ])
}

export function TraceDetailPageClient({ traceId, lang, dict }: { traceId: string; lang: string; dict: Dictionary }) {
  const detailQuery = useQuery({
    queryKey: queryKeys.traces.detail(traceId),
    queryFn: () => bffFetch<TraceRunDetail>(`/traces/${traceId}`),
  })

  const byParent = detailQuery.data ? buildTree(detailQuery.data.spans) : null

  return (
    <div className="grid gap-4 px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>{dict.traceDetailPage.title}</CardTitle>
        </CardHeader>
        <CardContent>
          {detailQuery.isPending ? <p className="text-sm text-muted-foreground">…</p> : null}
          {detailQuery.data && byParent ? (
            <div className="grid gap-1 font-mono text-xs">{renderSpans(byParent, null, lang, 0)}</div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
