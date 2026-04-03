"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { bffFetch, ClientHttpError } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/query-keys"
import type { EvaluationCriteria, PlatformApiKeyMeta } from "@/lib/api/types"
import type { Dictionary } from "@/app/[lang]/dictionaries"

export function SettingsDeveloperSection({ dict }: { dict: Dictionary }) {
  const d = dict.settings.developerCard
  const queryClient = useQueryClient()
  const criteriaQuery = useQuery({
    queryKey: queryKeys.settings.evaluationCriteria,
    queryFn: () => bffFetch<EvaluationCriteria[]>("/evaluation/criteria"),
  })
  const keysQuery = useQuery({
    queryKey: queryKeys.settings.platformApiKeys,
    queryFn: () => bffFetch<PlatformApiKeyMeta[]>("/platform-api-keys"),
  })

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [prompt, setPrompt] = useState("Avalie o texto: {{output}}\nDê nota de 1 a 10 e explique.")
  const [newKeyPlain, setNewKeyPlain] = useState<string | null>(null)

  const createCriteria = useMutation({
    mutationFn: () =>
      bffFetch<EvaluationCriteria>("/evaluation/criteria", {
        method: "POST",
        body: { name, description: description || undefined, prompt },
      }),
    onSuccess: () => {
      toast.success(d.criteriaCreated)
      setName("")
      setDescription("")
      void queryClient.invalidateQueries({ queryKey: queryKeys.settings.evaluationCriteria })
    },
    onError: (e) => toast.error(e instanceof ClientHttpError ? e.message : d.criteriaError),
  })

  const createKey = useMutation({
    mutationFn: () => bffFetch<{ id: string; apiKey: string }>("/platform-api-keys", { method: "POST" }),
    onSuccess: (data) => {
      setNewKeyPlain(data.apiKey)
      toast.success(d.apiKeyCreated)
      void queryClient.invalidateQueries({ queryKey: queryKeys.settings.platformApiKeys })
    },
    onError: (e) => toast.error(e instanceof ClientHttpError ? e.message : d.apiKeyError),
  })

  const revokeKey = useMutation({
    mutationFn: (id: string) => bffFetch(`/platform-api-keys/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success(d.apiKeyRevoked)
      void queryClient.invalidateQueries({ queryKey: queryKeys.settings.platformApiKeys })
    },
  })

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{d.criteriaTitle}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <p className="text-sm text-muted-foreground">{d.criteriaHint}</p>
          <div className="grid gap-2">
            <Label htmlFor="crit-name">{d.criteriaName}</Label>
            <Input id="crit-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="crit-desc">{d.criteriaDescription}</Label>
            <Input id="crit-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="crit-prompt">{d.criteriaPrompt}</Label>
            <Textarea id="crit-prompt" rows={5} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          </div>
          <Button
            type="button"
            className="w-fit cursor-pointer"
            disabled={createCriteria.isPending || !name.trim() || !prompt.trim()}
            onClick={() => createCriteria.mutate()}
          >
            {d.criteriaSave}
          </Button>
          <div className="border-t pt-3">
            <p className="mb-2 text-sm font-medium">{d.criteriaList}</p>
            {criteriaQuery.isPending ? <p className="text-sm text-muted-foreground">{d.loading}</p> : null}
            {criteriaQuery.data && criteriaQuery.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">{d.criteriaEmpty}</p>
            ) : null}
            <ul className="grid gap-2 text-sm">
              {criteriaQuery.data?.map((c) => (
                <li key={c.id} className="rounded border p-2">
                  <span className="font-medium">{c.name}</span>
                  {c.description ? <span className="text-muted-foreground"> — {c.description}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{d.apiKeysTitle}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <p className="text-sm text-muted-foreground">{d.apiKeysHint}</p>
          {newKeyPlain ? (
            <div className="rounded border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
              <p className="mb-1 font-medium">{d.apiKeyOnce}</p>
              <code className="break-all">{newKeyPlain}</code>
              <Button type="button" variant="outline" size="sm" className="mt-2 cursor-pointer" onClick={() => void navigator.clipboard.writeText(newKeyPlain)}>
                {d.copy}
              </Button>
            </div>
          ) : null}
          <Button type="button" className="w-fit cursor-pointer" disabled={createKey.isPending} onClick={() => createKey.mutate()}>
            {d.apiKeyCreate}
          </Button>
          <ul className="grid gap-2 text-sm">
            {keysQuery.data?.map((k) => (
              <li key={k.id} className="flex items-center justify-between gap-2 rounded border p-2">
                <span className="truncate font-mono text-xs">
                  {k.keyPrefix}… <span className="text-muted-foreground">({k.id.slice(0, 8)}…)</span>
                </span>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="cursor-pointer"
                  disabled={revokeKey.isPending}
                  onClick={() => revokeKey.mutate(k.id)}
                >
                  {d.apiKeyRevoke}
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
