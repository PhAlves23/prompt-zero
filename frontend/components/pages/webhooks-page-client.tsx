"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { bffFetch, ClientHttpError } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/query-keys"
import type { WebhookDeliveryItem, WebhookItem } from "@/lib/api/types"
import type { Dictionary } from "@/app/[lang]/dictionaries"
import { formatDateTimeLocale } from "@/lib/format-datetime"

export function WebhooksPageClient({ lang, dict }: { lang: string; dict: Dictionary }) {
  const d = dict.webhooksPage
  const qc = useQueryClient()
  const [url, setUrl] = useState("https://example.com/hook")
  const [events, setEvents] = useState("execution.completed")
  const [secretFlash, setSecretFlash] = useState<string | null>(null)
  const [openDeliveries, setOpenDeliveries] = useState<string | null>(null)

  const listQuery = useQuery({
    queryKey: queryKeys.webhooks.list,
    queryFn: () => bffFetch<WebhookItem[]>("/webhooks"),
  })

  const deliveriesQuery = useQuery({
    queryKey: queryKeys.webhooks.deliveries(openDeliveries ?? ""),
    queryFn: () => bffFetch<WebhookDeliveryItem[]>(`/webhooks/${openDeliveries}/deliveries`),
    enabled: Boolean(openDeliveries),
  })

  const createMutation = useMutation({
    mutationFn: () =>
      bffFetch<WebhookItem & { secret: string }>("/webhooks", {
        method: "POST",
        body: {
          url,
          events: events.split(",").map((e) => e.trim()).filter(Boolean),
        },
      }),
    onSuccess: (row) => {
      setSecretFlash(row.secret)
      void qc.invalidateQueries({ queryKey: queryKeys.webhooks.list })
      toast.success("OK")
    },
    onError: (e) => toast.error(e instanceof ClientHttpError ? e.message : "Error"),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => bffFetch(`/webhooks/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.webhooks.list })
      toast.success("Removed")
    },
  })

  return (
    <div className="grid gap-4 px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>{d.title}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {secretFlash ? (
            <div className="rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <p className="font-medium">{d.secretOnce}</p>
              <code className="break-all">{secretFlash}</code>
            </div>
          ) : null}
          <div className="grid gap-2">
            <Label>{d.url}</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>{d.events}</Label>
            <Input value={events} onChange={(e) => setEvents(e.target.value)} />
          </div>
          <Button type="button" className="w-fit cursor-pointer" disabled={createMutation.isPending} onClick={() => createMutation.mutate()}>
            {d.create}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {!listQuery.data?.length ? <p className="text-sm text-muted-foreground">{d.empty}</p> : null}
          {listQuery.data?.map((w) => (
            <div key={w.id} className="rounded border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="break-all font-mono text-xs">{w.url}</span>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" className="cursor-pointer" onClick={() => setOpenDeliveries(openDeliveries === w.id ? null : w.id)}>
                    {d.deliveries}
                  </Button>
                  <Button type="button" size="sm" variant="destructive" className="cursor-pointer" onClick={() => deleteMutation.mutate(w.id)}>
                    ×
                  </Button>
                </div>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{w.events.join(", ")}</p>
              {openDeliveries === w.id ? (
                <ul className="mt-2 max-h-40 overflow-auto border-t pt-2 text-xs">
                  {deliveriesQuery.data?.map((del) => (
                    <li key={del.id} className="mb-1">
                      {del.event} · {del.statusCode ?? "?"} · {formatDateTimeLocale(del.createdAt, lang)}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
