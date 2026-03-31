"use client"

import Link from "next/link"
import { parseAsString, useQueryState } from "nuqs"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { bffFetch } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/query-keys"
import type { ExplorePrompt, PaginatedResult } from "@/lib/api/types"
import type { Dictionary } from "@/app/[lang]/dictionaries"

export function ExplorePageClient({ lang, dict }: { lang: string; dict: Dictionary }) {
  const [search, setSearch] = useQueryState("search", parseAsString.withDefault(""))
  const query = new URLSearchParams({
    page: "1",
    limit: "24",
    ...(search ? { search } : {}),
  })

  const promptsQuery = useQuery({
    queryKey: queryKeys.explore.list(query.toString()),
    queryFn: () => bffFetch<PaginatedResult<ExplorePrompt>>(`/explore?${query.toString()}`),
  })

  return (
    <div className="grid gap-4 px-4 lg:px-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              {dict.explore.list.title}
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              {promptsQuery.data?.meta.total ?? 0} {dict.explore.list.results}
            </span>
          </div>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="max-w-sm"
            placeholder={dict.explore.list.searchPlaceholder}
          />
        </CardHeader>
        <CardContent>
          {promptsQuery.isPending ? (
            <p className="text-sm text-muted-foreground">{dict.explore.list.loading}</p>
          ) : promptsQuery.data && promptsQuery.data.data.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {promptsQuery.data.data.map((prompt) => (
                <Link
                  key={prompt.id}
                  href={`/${lang}/explore/${prompt.id}`}
                  className="group rounded-2xl border bg-card/95 p-4 transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:bg-card hover:shadow-lg cursor-pointer"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="rounded-full border bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                      {prompt.language.toUpperCase()}
                    </span>
                    <span className="rounded-full border bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                      {prompt.model}
                    </span>
                  </div>
                  <h3 className="font-medium text-foreground">{prompt.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                    {prompt.description ?? dict.explore.common.noDescription}
                  </p>
                  <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                    <span>{dict.explore.common.publicLabel}</span>
                    <span>
                      {dict.explore.list.forksLabel}: <span className="font-medium text-foreground">{prompt.forkCount}</span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>{dict.explore.list.emptyTitle}</EmptyTitle>
                <EmptyDescription>{dict.explore.list.emptyDescription}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
