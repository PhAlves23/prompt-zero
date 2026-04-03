"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { bffFetch } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/query-keys"
import { simpleLineDiff } from "@/lib/text-diff"
import type { Prompt, PromptVersion } from "@/lib/api/types"
import type { Dictionary } from "@/app/[lang]/dictionaries"
import { formatDateTimeLocale } from "@/lib/format-datetime"

export function PromptVersionDetailClient({
  lang,
  promptId,
  versionId,
  dict,
}: {
  lang: string
  promptId: string
  versionId: string
  dict: Dictionary
}) {
  const queryClient = useQueryClient()
  const versionQuery = useQuery({
    queryKey: ["prompts", "version-detail", promptId, versionId] as const,
    queryFn: () => bffFetch<PromptVersion>(`/prompts/${promptId}/versions/${versionId}`),
  })

  const promptQuery = useQuery({
    queryKey: queryKeys.prompts.detail(promptId),
    queryFn: () => bffFetch<Prompt>(`/prompts/${promptId}`),
  })

  const restoreVersion = useMutation({
    mutationFn: () => bffFetch(`/prompts/${promptId}/versions/${versionId}/restore`, { method: "POST" }),
    onSuccess: () => {
      toast.success(dict.prompts.detail.toasts.versionRestored)
      void queryClient.invalidateQueries({ queryKey: queryKeys.prompts.detail(promptId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.prompts.versions(promptId) })
    },
  })

  if (versionQuery.isPending) {
    return <div className="px-4 lg:px-6 text-sm text-muted-foreground">{dict.common.loading}</div>
  }

  if (versionQuery.isError || !versionQuery.data) {
    return (
      <div className="px-4 lg:px-6">
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>{dict.prompts.versionDetail.notFoundTitle}</EmptyTitle>
            <EmptyDescription>{dict.prompts.versionDetail.notFoundDescription}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  const diffLines =
    promptQuery.data && versionQuery.data
      ? simpleLineDiff(versionQuery.data.content, promptQuery.data.content)
      : []

  return (
    <div className="grid gap-4 px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>{dict.prompts.versionDetail.versionLabel} {versionQuery.data.version}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <p className="text-xs text-muted-foreground">
            {dict.prompts.detail.versions.dateTimePrefix} {formatDateTimeLocale(versionQuery.data.createdAt, lang)}
          </p>
          <pre className="max-h-[480px] overflow-auto rounded border bg-card p-3 text-sm whitespace-pre-wrap">
            {versionQuery.data.content}
          </pre>
          <Button
            type="button"
            className="w-fit cursor-pointer"
            onClick={() => restoreVersion.mutate()}
            disabled={restoreVersion.isPending}
          >
            {dict.prompts.versionDetail.restoreCta}
          </Button>
        </CardContent>
      </Card>

      {promptQuery.data && diffLines.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{dict.prompts.versionDetail.diffTitle}</CardTitle>
            <p className="text-sm text-muted-foreground">{dict.prompts.versionDetail.diffHint}</p>
          </CardHeader>
          <CardContent>
            <div className="max-h-[360px] overflow-auto rounded border font-mono text-xs">
              {diffLines.map((line, i) => (
                <div
                  key={i}
                  className={
                    line.type === "remove"
                      ? "bg-red-500/10 text-red-700 dark:text-red-300"
                      : line.type === "add"
                        ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                        : "text-muted-foreground"
                  }
                >
                  <span className="inline-block w-8 shrink-0 select-none px-1 text-center opacity-50">
                    {line.type === "remove" ? "-" : line.type === "add" ? "+" : " "}
                  </span>
                  <span className="whitespace-pre-wrap break-all">{line.text}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              <span className="text-red-600 dark:text-red-400">{dict.prompts.versionDetail.diffRemoved}</span>
              {" · "}
              <span className="text-emerald-600 dark:text-emerald-400">{dict.prompts.versionDetail.diffAdded}</span>
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
