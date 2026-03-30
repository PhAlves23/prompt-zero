"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { bffFetch } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/query-keys"
import type { PromptVersion } from "@/lib/api/types"

export function PromptVersionDetailClient({
  promptId,
  versionId,
}: {
  promptId: string
  versionId: string
}) {
  const queryClient = useQueryClient()
  const versionQuery = useQuery({
    queryKey: ["prompts", "version-detail", promptId, versionId] as const,
    queryFn: () => bffFetch<PromptVersion>(`/prompts/${promptId}/versions/${versionId}`),
  })

  const restoreVersion = useMutation({
    mutationFn: () => bffFetch(`/prompts/${promptId}/versions/${versionId}/restore`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Versao restaurada")
      void queryClient.invalidateQueries({ queryKey: queryKeys.prompts.detail(promptId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.prompts.versions(promptId) })
    },
  })

  if (versionQuery.isPending) {
    return <div className="px-4 lg:px-6 text-sm text-muted-foreground">Carregando versao...</div>
  }

  if (versionQuery.isError || !versionQuery.data) {
    return (
      <div className="px-4 lg:px-6">
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>Versao nao encontrada</EmptyTitle>
            <EmptyDescription>Verifique se a versao ainda existe para esse prompt.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  return (
    <div className="grid gap-4 px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Versao {versionQuery.data.version}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <p className="text-xs text-muted-foreground">
            Criada em {new Date(versionQuery.data.createdAt).toLocaleString()}
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
            Restaurar esta versao
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
