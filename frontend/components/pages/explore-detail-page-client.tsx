"use client"

import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Copy, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { bffFetch } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/query-keys"
import type { ExplorePrompt, Prompt, UserProfile } from "@/lib/api/types"
import type { Dictionary } from "@/app/[lang]/dictionaries"

export function ExploreDetailPageClient({
  lang,
  promptId,
  dict,
}: {
  lang: string
  promptId: string
  dict: Dictionary
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
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
      toast.success(dict.explore.detail.toastForkSuccess)
      void queryClient.invalidateQueries({ queryKey: ["prompts", "list"] })
      router.push(`/${lang}/prompts/${forkedPrompt.id}`)
      router.refresh()
    },
    onError: () => {
      toast.error(dict.explore.detail.toastForkError)
    },
  })

  if (promptQuery.isPending) {
    return <div className="px-4 lg:px-6 text-sm text-muted-foreground">{dict.explore.detail.loading}</div>
  }

  if (promptQuery.isError || !promptQuery.data) {
    return (
      <div className="px-4 lg:px-6">
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>{dict.explore.detail.notFoundTitle}</EmptyTitle>
            <EmptyDescription>{dict.explore.detail.notFoundDescription}</EmptyDescription>
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
          <p className="text-sm text-muted-foreground">{promptQuery.data.description ?? dict.explore.common.noDescription}</p>
          <div className="grid gap-2">
            <Label htmlFor="explore-prompt-content" className="text-foreground">
              {dict.prompts.createForm.fields.content}
            </Label>
            <Textarea
              id="explore-prompt-content"
              readOnly
              value={promptQuery.data.content}
              rows={16}
              spellCheck={false}
              className="field-sizing-fixed max-h-[min(480px,70vh)] min-h-[240px] resize-y font-mono text-sm leading-relaxed wrap-break-word"
            />
          </div>
          <div>
            {authMeQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">{dict.explore.detail.checkingSession}</p>
            ) : authMeQuery.isSuccess ? (
              <Button
                type="button"
                className="cursor-pointer"
                onClick={() => forkPrompt.mutate()}
                disabled={forkPrompt.isPending}
              >
                <Copy className="h-4 w-4" />
                {forkPrompt.isPending ? dict.explore.detail.forking : dict.explore.detail.forkCta}
              </Button>
            ) : (
              <Link
                href={`/${lang}/auth/login`}
                className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent cursor-pointer"
              >
                <LogIn className="h-4 w-4" />
                {dict.explore.detail.loginToFork}
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
