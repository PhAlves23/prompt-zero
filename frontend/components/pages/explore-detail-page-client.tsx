"use client"

import Link from "next/link"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Copy, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { bffFetch } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/query-keys"
import type { ExplorePrompt, Prompt, UserProfile } from "@/lib/api/types"

export function ExploreDetailPageClient({
  lang,
  promptId,
}: {
  lang: string
  promptId: string
}) {
  const router = useRouter()
  const promptQuery = useQuery({
    queryKey: queryKeys.explore.detail(promptId),
    queryFn: () => bffFetch<ExplorePrompt>(`/explore/${promptId}`),
  })
  const authMeQuery = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: () => bffFetch<UserProfile>("/auth/me"),
    retry: false,
  })
  const forkPrompt = useMutation({
    mutationFn: () => bffFetch<Prompt>(`/prompts/${promptId}/fork`, { method: "POST" }),
    onSuccess: (forkedPrompt) => {
      toast.success("Prompt duplicado com sucesso")
      router.push(`/${lang}/prompts/${forkedPrompt.id}`)
      router.refresh()
    },
    onError: () => {
      toast.error("Nao foi possivel duplicar este prompt")
    },
  })

  if (promptQuery.isPending) {
    return <div className="px-4 lg:px-6 text-sm text-muted-foreground">Carregando prompt publico...</div>
  }

  if (promptQuery.isError || !promptQuery.data) {
    return (
      <div className="px-4 lg:px-6">
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>Prompt nao encontrado</EmptyTitle>
            <EmptyDescription>Esse prompt pode nao ser publico ou nao existir mais.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  return (
    <div className="grid gap-4 px-4 lg:px-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>{promptQuery.data.title}</CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border px-2 py-0.5">{promptQuery.data.language.toUpperCase()}</span>
              <span className="rounded-full border px-2 py-0.5">{promptQuery.data.model}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-sm text-muted-foreground">{promptQuery.data.description ?? "Sem descricao"}</p>
          <pre className="max-h-[420px] overflow-auto rounded border bg-card p-3 text-sm whitespace-pre-wrap">
            {promptQuery.data.content}
          </pre>
          <div>
            {authMeQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Verificando sessao...</p>
            ) : authMeQuery.isSuccess ? (
              <Button
                type="button"
                className="cursor-pointer"
                onClick={() => forkPrompt.mutate()}
                disabled={forkPrompt.isPending}
              >
                <Copy className="h-4 w-4" />
                {forkPrompt.isPending ? "Duplicando..." : "Duplicar este prompt"}
              </Button>
            ) : (
              <Link
                href={`/${lang}/auth/login`}
                className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent cursor-pointer"
              >
                <LogIn className="h-4 w-4" />
                Fazer login para duplicar este prompt
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
