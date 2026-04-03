"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import type { WebhookItem } from "@/lib/api/types"
import type { Dictionary } from "@/app/[lang]/dictionaries"
import { WEBHOOK_EVENTS } from "@/lib/webhooks/events"
import { useMemo, useState } from "react"

type Dict = Dictionary["webhooksPage"]

function filtersToText(filters: Record<string, unknown> | null | undefined): string {
  if (!filters || typeof filters !== "object") return ""
  return Object.entries(filters)
    .map(([k, v]) => `${k}=${String(v)}`)
    .join("\n")
}

type Props = {
  dict: Dict
  webhook: WebhookItem
  open: boolean
  onOpenChange: (open: boolean) => void
  isPending: boolean
  onSave: (id: string, body: Record<string, unknown>) => void
}

function parseFilters(text: string): Record<string, string> | null {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return null
  const out: Record<string, string> = {}
  for (const line of lines) {
    const eq = line.indexOf("=")
    if (eq <= 0) continue
    const k = line.slice(0, eq).trim()
    const v = line.slice(eq + 1).trim()
    if (k && v) out[k] = v
  }
  return Object.keys(out).length ? out : null
}

function initialFromWebhook(w: WebhookItem) {
  return {
    name: w.name ?? "",
    url: w.url,
    events: [...w.events],
    filtersText: filtersToText(w.filters as Record<string, unknown> | null),
    retryCount: w.retryCount,
    timeoutMs: w.timeoutMs,
  }
}

export function WebhookEditDialog({ dict, webhook, open, onOpenChange, isPending, onSave }: Props) {
  const init = initialFromWebhook(webhook)
  const [name, setName] = useState(init.name)
  const [url, setUrl] = useState(init.url)
  const [events, setEvents] = useState<string[]>(init.events)
  const [filtersText, setFiltersText] = useState(init.filtersText)
  const [retryCount, setRetryCount] = useState(init.retryCount)
  const [timeoutMs, setTimeoutMs] = useState(init.timeoutMs)

  const selected = useMemo(() => new Set(events), [events])

  const toggleEvent = (e: string) => {
    const next = new Set(events)
    if (next.has(e)) next.delete(e)
    else next.add(e)
    setEvents(Array.from(next))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{dict.editDialogTitle}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-2">
            <Label>{dict.nameOptional}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>{dict.url}</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>{dict.eventsPick}</Label>
            <ScrollArea className="h-40 rounded border p-2">
              <ul className="grid gap-2 pr-3">
                {WEBHOOK_EVENTS.map((ev) => (
                  <li key={ev} className="flex items-center gap-2">
                    <Checkbox
                      id={`edit-ev-${ev}`}
                      checked={selected.has(ev)}
                      onCheckedChange={() => toggleEvent(ev)}
                    />
                    <label htmlFor={`edit-ev-${ev}`} className="cursor-pointer font-mono text-xs">
                      {ev}
                    </label>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>
          <div className="grid gap-2">
            <Label>{dict.filtersHint}</Label>
            <Textarea value={filtersText} onChange={(e) => setFiltersText(e.target.value)} rows={3} className="font-mono text-xs" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>{dict.retryCount}</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={retryCount}
                onChange={(e) => setRetryCount(Math.min(10, Math.max(1, Number(e.target.value) || 1)))}
              />
            </div>
            <div className="grid gap-2">
              <Label>{dict.timeoutMs}</Label>
              <Input
                type="number"
                min={1000}
                max={120000}
                value={timeoutMs}
                onChange={(e) =>
                  setTimeoutMs(Math.min(120_000, Math.max(1000, Number(e.target.value) || 60000)))
                }
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {dict.close}
          </Button>
          <Button
            type="button"
            disabled={isPending || !url.trim() || events.length === 0}
            onClick={() => {
              const filters = parseFilters(filtersText)
              onSave(webhook.id, {
                name: name.trim() || null,
                url: url.trim(),
                events,
                filters: filters === null ? null : filters,
                retryCount,
                timeoutMs,
              })
            }}
          >
            {dict.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
