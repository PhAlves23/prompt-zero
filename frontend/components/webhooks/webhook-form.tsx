"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import type { Dictionary } from "@/app/[lang]/dictionaries"
import { WEBHOOK_EVENTS } from "@/lib/webhooks/events"
import { ChevronDown } from "lucide-react"
import { useMemo, useState } from "react"

export type WebhookCreateFormState = {
  name: string
  url: string
  events: string[]
  filtersText: string
  retryCount: number
  timeoutMs: number
}

type WebhookFormDict = Dictionary["webhooksPage"]

type Props = {
  dict: WebhookFormDict
  form: WebhookCreateFormState
  onChange: (next: WebhookCreateFormState) => void
  secretFlash: string | null
  isSubmitting: boolean
  onSubmit: () => void
}

function parseFilters(text: string): Record<string, string> | undefined {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return undefined
  const out: Record<string, string> = {}
  for (const line of lines) {
    const eq = line.indexOf("=")
    if (eq <= 0) continue
    const k = line.slice(0, eq).trim()
    const v = line.slice(eq + 1).trim()
    if (k && v) out[k] = v
  }
  return Object.keys(out).length ? out : undefined
}

export function buildCreateWebhookBody(form: WebhookCreateFormState) {
  return {
    name: form.name.trim() || undefined,
    url: form.url.trim(),
    events: form.events,
    filters: parseFilters(form.filtersText),
    retryCount: form.retryCount,
    timeoutMs: form.timeoutMs,
  }
}

export function WebhookForm({
  dict,
  form,
  onChange,
  secretFlash,
  isSubmitting,
  onSubmit,
}: Props) {
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const selected = useMemo(() => new Set(form.events), [form.events])

  const toggleEvent = (e: string) => {
    const next = new Set(form.events)
    if (next.has(e)) next.delete(e)
    else next.add(e)
    onChange({ ...form, events: Array.from(next) })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.formTitle}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {secretFlash ? (
          <div className="rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <p className="font-medium">{dict.secretOnce}</p>
            <code className="break-all">{secretFlash}</code>
          </div>
        ) : null}
        <div className="grid gap-2">
          <Label>{dict.nameOptional}</Label>
          <Input
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
            placeholder={dict.namePlaceholder}
          />
        </div>
        <div className="grid gap-2">
          <Label>{dict.url}</Label>
          <Input
            value={form.url}
            onChange={(e) => onChange({ ...form, url: e.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label>{dict.eventsPick}</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto py-1 text-xs"
              onClick={() =>
                onChange({
                  ...form,
                  events: [...WEBHOOK_EVENTS],
                })
              }
            >
              {dict.selectAllEvents}
            </Button>
          </div>
          <ScrollArea className="h-48 rounded border p-2">
            <ul className="grid gap-2 pr-3">
              {WEBHOOK_EVENTS.map((ev) => (
                <li key={ev} className="flex items-center gap-2">
                  <Checkbox
                    id={`ev-${ev}`}
                    checked={selected.has(ev)}
                    onCheckedChange={() => toggleEvent(ev)}
                  />
                  <label htmlFor={`ev-${ev}`} className="cursor-pointer font-mono text-xs">
                    {ev}
                  </label>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </div>

        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="w-fit gap-1">
              {dict.advanced}
              <ChevronDown className={`size-4 transition ${advancedOpen ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 grid gap-3">
            <div className="grid gap-2">
              <Label>{dict.filtersHint}</Label>
              <Textarea
                value={form.filtersText}
                onChange={(e) => onChange({ ...form, filtersText: e.target.value })}
                placeholder={dict.filtersPlaceholder}
                rows={4}
                className="font-mono text-xs"
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>{dict.retryCount}</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={form.retryCount}
                  onChange={(e) =>
                    onChange({
                      ...form,
                      retryCount: Math.min(10, Math.max(1, Number(e.target.value) || 1)),
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>{dict.timeoutMs}</Label>
                <Input
                  type="number"
                  min={1000}
                  max={120000}
                  step={1000}
                  value={form.timeoutMs}
                  onChange={(e) =>
                    onChange({
                      ...form,
                      timeoutMs: Math.min(
                        120_000,
                        Math.max(1000, Number(e.target.value) || 60000),
                      ),
                    })
                  }
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Button
          type="button"
          className="w-fit cursor-pointer"
          disabled={isSubmitting || !form.url.trim() || form.events.length === 0}
          onClick={onSubmit}
        >
          {dict.create}
        </Button>
      </CardContent>
    </Card>
  )
}
