"use client"

import Link from "next/link"
import { parseAsBoolean, parseAsString, useQueryState } from "nuqs"
import { useQuery } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { bffFetch } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/query-keys"
import type { PaginatedResult, Prompt } from "@/lib/api/types"

export function PromptsPageClient({ lang }: { lang: string }) {
  const [search, setSearch] = useQueryState("search", parseAsString.withDefault(""))
  const [isPublic, setIsPublic] = useQueryState("isPublic", parseAsBoolean.withDefault(false))
  const listQueryString = new URLSearchParams({
    page: "1",
    limit: "20",
    ...(search ? { search } : {}),
    ...(isPublic ? { isPublic: "true" } : {}),
  }).toString()

  const promptsQuery = useQuery({
    queryKey: queryKeys.prompts.list(listQueryString),
    queryFn: () => bffFetch<PaginatedResult<Prompt>>(`/prompts?${listQueryString}`),
  })

  return (
    <div className="grid gap-4 px-4 lg:px-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Meus prompts</CardTitle>
            <Button asChild className="cursor-pointer">
              <Link href={`/${lang}/prompts/new`}>
                <Plus className="h-4 w-4" />
                Cadastrar novo prompt
              </Link>
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por titulo"
              className="max-w-xs"
            />
            <div className="flex items-center gap-2">
              <Switch
                checked={isPublic}
                onCheckedChange={(checked) => setIsPublic(checked)}
                aria-label="Filtrar apenas prompts publicos"
              />
              <span className="text-sm text-muted-foreground">Apenas publicos</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {promptsQuery.isPending ? (
            <p className="text-sm text-muted-foreground">Carregando prompts...</p>
          ) : promptsQuery.isError ? (
            <p className="text-sm text-destructive">Erro ao carregar prompts.</p>
          ) : promptsQuery.data.data.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>Nenhum prompt encontrado</EmptyTitle>
                <EmptyDescription>Ajuste os filtros ou cadastre um novo prompt.</EmptyDescription>
              </EmptyHeader>
              <EmptyContent />
            </Empty>
          ) : (
            <div className="grid gap-3">
              {promptsQuery.data.data.map((prompt) => (
                <Link
                  href={`/${lang}/prompts/${prompt.id}`}
                  key={prompt.id}
                  className="rounded-lg border bg-card p-4 transition-colors hover:bg-accent cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-medium">{prompt.title}</h3>
                    <span className="text-xs text-muted-foreground">
                      {prompt.isPublic ? "Publico" : "Privado"}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                    {prompt.description ?? "Sem descricao"}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
