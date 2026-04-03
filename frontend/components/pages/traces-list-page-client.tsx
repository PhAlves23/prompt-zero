"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { bffFetch } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/query-keys"
import type { TraceRunListItem } from "@/lib/api/types"
import type { Dictionary } from "@/app/[lang]/dictionaries"
import { formatDateTimeLocale } from "@/lib/format-datetime"

export function TracesListPageClient({ lang, dict }: { lang: string; dict: Dictionary }) {
  const d = dict.tracesPage
  const listQuery = useQuery({
    queryKey: queryKeys.traces.list,
    queryFn: () => bffFetch<TraceRunListItem[]>("/traces"),
  })

  return (
    <div className="grid gap-4 px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>{d.title}</CardTitle>
        </CardHeader>
        <CardContent>
          {listQuery.isPending ? <p className="text-sm text-muted-foreground">…</p> : null}
          {!listQuery.data?.length ? <p className="text-sm text-muted-foreground">{d.listEmpty}</p> : null}
          <ul className="grid gap-2 text-sm">
            {listQuery.data?.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-2">
                <Link href={`/${lang}/traces/${t.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
                  {t.name ?? t.id.slice(0, 8)}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {formatDateTimeLocale(t.createdAt, lang)} · {t._count.spans} {d.spans}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
