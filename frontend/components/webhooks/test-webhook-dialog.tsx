"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Dictionary } from "@/app/[lang]/dictionaries"
import { WEBHOOK_EVENTS } from "@/lib/webhooks/events"
import { useState } from "react"
import { toast } from "sonner"

type Dict = Dictionary["webhooksPage"]

export type TestWebhookResult = {
  ok: boolean
  statusCode: number
  responseBody: string | null
  errorMessage?: string
  requestBody: string
  headersSent: Record<string, string>
}

type Props = {
  dict: Dict
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultEvent: string
  isPending: boolean
  onRun: (event: string, payload?: Record<string, unknown>) => void
  invalidPayloadMessage: string
  result: TestWebhookResult | null
}

export function TestWebhookDialog({
  dict,
  open,
  onOpenChange,
  defaultEvent,
  isPending,
  onRun,
  result,
  invalidPayloadMessage,
}: Props) {
  const [event, setEvent] = useState(defaultEvent)
  const [payloadText, setPayloadText] = useState("")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{dict.testDialogTitle}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-2">
            <Label>{dict.testEvent}</Label>
            <Select value={event} onValueChange={setEvent}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEBHOOK_EVENTS.map((ev) => (
                  <SelectItem key={ev} value={ev}>
                    {ev}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>{dict.testPayloadOptional}</Label>
            <Textarea
              value={payloadText}
              onChange={(e) => setPayloadText(e.target.value)}
              placeholder="{ }"
              rows={6}
              className="font-mono text-xs"
            />
          </div>
          {result ? (
            <div className="rounded border p-2 text-xs space-y-1 font-mono">
              <p>
                <span className="text-muted-foreground">{dict.testStatus}: </span>
                {result.statusCode}{" "}
                {result.ok ? <span className="text-green-600">{dict.testOk}</span> : <span className="text-destructive">{dict.testFail}</span>}
              </p>
              {result.errorMessage ? (
                <p className="text-destructive break-all">{result.errorMessage}</p>
              ) : null}
              {result.responseBody ? (
                <pre className="whitespace-pre-wrap break-all max-h-32 overflow-auto">{result.responseBody}</pre>
              ) : null}
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {dict.close}
          </Button>
          <Button
            type="button"
            disabled={isPending}
            onClick={() => {
              let payload: Record<string, unknown> | undefined
              const t = payloadText.trim()
              if (t) {
                try {
                  payload = JSON.parse(t) as Record<string, unknown>
                } catch {
                  toast.error(invalidPayloadMessage)
                  return
                }
              }
              onRun(event, payload)
            }}
          >
            {dict.testSend}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
