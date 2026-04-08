"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { Database } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { bffFetch, ClientHttpError } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/query-keys"
import type { CacheStats, Workspace, WorkspaceCacheConfig } from "@/lib/api/types"
import type { Dictionary } from "@/app/[lang]/dictionaries"

const TTL_OPTIONS = [
  { value: 3600, labelKey: "ttl1h" as const },
  { value: 86400, labelKey: "ttl24h" as const },
  { value: 604800, labelKey: "ttl7d" as const },
  { value: 2592000, labelKey: "ttl30d" as const },
]

export function SettingsCacheSection({ dict }: { dict: Dictionary }) {
  const qc = useQueryClient()
  const c = dict.settings.cacheCard

  const workspacesQuery = useQuery({
    queryKey: queryKeys.workspaces.list,
    queryFn: () => bffFetch<Workspace[]>("/workspaces"),
  })

  const [workspaceId, setWorkspaceId] = useState<string | null>(null)

  useEffect(() => {
    const list = workspacesQuery.data
    if (!list?.length || workspaceId) {
      return
    }
    setWorkspaceId(list[0].id)
  }, [workspacesQuery.data, workspaceId])

  const configQuery = useQuery({
    queryKey: queryKeys.cache.config(workspaceId ?? ""),
    queryFn: () => bffFetch<WorkspaceCacheConfig>(`/workspaces/${workspaceId}/cache/config`),
    enabled: Boolean(workspaceId),
  })

  const statsPeriod = "7d"
  const statsQuery = useQuery({
    queryKey: queryKeys.cache.stats(workspaceId ?? "", statsPeriod),
    queryFn: () =>
      bffFetch<CacheStats>(`/workspaces/${workspaceId}/cache/stats?period=${statsPeriod}`),
    enabled: Boolean(workspaceId) && Boolean(configQuery.data?.cacheEnabled),
  })

  const updateConfig = useMutation({
    mutationFn: (body: Partial<{ cacheEnabled: boolean; cacheTtlSeconds: number }>) => {
      if (!workspaceId) {
        throw new Error("no workspace")
      }
      return bffFetch<WorkspaceCacheConfig>(`/workspaces/${workspaceId}/cache/config`, {
        method: "PATCH",
        body,
      })
    },
    onSuccess: () => {
      if (!workspaceId) {
        return
      }
      toast.success(c.toastUpdated)
      void qc.invalidateQueries({ queryKey: queryKeys.cache.config(workspaceId) })
      void qc.invalidateQueries({ queryKey: queryKeys.cache.stats(workspaceId, statsPeriod) })
    },
    onError: (err) => {
      toast.error(err instanceof ClientHttpError ? err.message : c.toastError)
    },
  })

  const invalidate = useMutation({
    mutationFn: () => {
      if (!workspaceId) {
        throw new Error("no workspace")
      }
      return bffFetch<{ deleted: number }>(`/workspaces/${workspaceId}/cache`, {
        method: "DELETE",
      })
    },
    onSuccess: (res) => {
      if (!workspaceId) {
        return
      }
      toast.success(c.toastInvalidated.replace("{count}", String(res.deleted)))
      void qc.invalidateQueries({ queryKey: queryKeys.cache.stats(workspaceId, statsPeriod) })
    },
    onError: (err) => {
      toast.error(err instanceof ClientHttpError ? err.message : c.invalidateError)
    },
  })

  const ttlLabels = useMemo(
    () => ({
      ttl1h: c.ttl1h,
      ttl24h: c.ttl24h,
      ttl7d: c.ttl7d,
      ttl30d: c.ttl30d,
    }),
    [c],
  )

  if (workspacesQuery.isPending) {
    return <p className="text-sm text-muted-foreground">{c.loadingWorkspaces}</p>
  }
  if (workspacesQuery.isError || !workspacesQuery.data?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{c.title}</CardTitle>
          <CardDescription>{c.noWorkspaces}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          {c.title}
        </CardTitle>
        <CardDescription>{c.description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="grid gap-2">
          <Label>{c.workspaceLabel}</Label>
          <Select
            value={workspaceId ?? undefined}
            onValueChange={(id) => {
              setWorkspaceId(id)
            }}
          >
            <SelectTrigger className="w-full max-w-md cursor-pointer">
              <SelectValue placeholder={c.workspacePlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {workspacesQuery.data.map((w) => (
                <SelectItem key={w.id} value={w.id} className="cursor-pointer">
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {configQuery.isPending ? (
          <p className="text-sm text-muted-foreground">{c.loadingConfig}</p>
        ) : configQuery.isError ? (
          <p className="text-sm text-destructive">{c.loadConfigError}</p>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="cache-enabled">{c.enabledLabel}</Label>
                <p className="text-sm text-muted-foreground">{c.enabledHint}</p>
              </div>
              <Switch
                id="cache-enabled"
                checked={configQuery.data?.cacheEnabled ?? false}
                disabled={updateConfig.isPending}
                className="cursor-pointer"
                onCheckedChange={(checked) => {
                  updateConfig.mutate({ cacheEnabled: checked })
                }}
              />
            </div>

            {configQuery.data?.cacheEnabled ? (
              <>
                <div className="grid gap-2">
                  <Label>{c.ttlLabel}</Label>
                  <Select
                    value={String(configQuery.data.cacheTtlSeconds)}
                    onValueChange={(v) => {
                      updateConfig.mutate({ cacheTtlSeconds: Number(v) })
                    }}
                    disabled={updateConfig.isPending}
                  >
                    <SelectTrigger className="w-full max-w-md cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TTL_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={String(opt.value)} className="cursor-pointer">
                          {ttlLabels[opt.labelKey]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {statsQuery.isPending ? (
                  <p className="text-sm text-muted-foreground">{c.loadingStats}</p>
                ) : statsQuery.data ? (
                  <div className="grid gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground">{c.hitRate}</p>
                      <p className="text-lg font-semibold">{statsQuery.data.hitRate}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{c.savings}</p>
                      <p className="text-lg font-semibold">${statsQuery.data.savedCost.toFixed(4)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{c.statsHits}</p>
                      <p className="text-lg font-semibold">{statsQuery.data.hits}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{c.savedTokens}</p>
                      <p className="text-lg font-semibold">
                        {statsQuery.data.savedTokens.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ) : null}

                <Button
                  type="button"
                  variant="destructive"
                  className="w-fit cursor-pointer"
                  disabled={invalidate.isPending}
                  onClick={() => {
                    invalidate.mutate()
                  }}
                >
                  {invalidate.isPending ? c.invalidating : c.invalidate}
                </Button>
              </>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
