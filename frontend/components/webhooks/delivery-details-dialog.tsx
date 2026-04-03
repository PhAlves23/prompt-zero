"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { WebhookDeliveryItem } from "@/lib/api/types"
import type { Dictionary } from "@/app/[lang]/dictionaries"
import { toast } from "sonner"

type Dict = Dictionary["webhooksPage"]

function prettyJson(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2)
  } catch {
    return String(v)
  }
}

type Props = {
  dict: Dict
  delivery: WebhookDeliveryItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeliveryDetailsDialog({ dict, delivery, open, onOpenChange }: Props) {
  if (!delivery) return null

  const headers = delivery.requestHeaders && typeof delivery.requestHeaders === "object"
    ? (delivery.requestHeaders as Record<string, unknown>)
    : null

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(dict.copied)
    } catch {
      toast.error(dict.copyFailed)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{dict.deliveryDetailsTitle}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="payload" className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="payload">{dict.tabPayload}</TabsTrigger>
            <TabsTrigger value="request">{dict.tabRequest}</TabsTrigger>
            <TabsTrigger value="response">{dict.tabResponse}</TabsTrigger>
          </TabsList>
          <TabsContent value="payload" className="space-y-2">
            <div className="flex justify-end">
              <Button type="button" size="sm" variant="outline" onClick={() => copy(prettyJson(delivery.payload))}>
                {dict.copy}
              </Button>
            </div>
            <pre className="text-xs font-mono rounded border p-3 max-h-64 overflow-auto whitespace-pre-wrap break-all">
              {prettyJson(delivery.payload)}
            </pre>
          </TabsContent>
          <TabsContent value="request" className="space-y-2">
            <p className="text-xs text-muted-foreground">{dict.tabRequestHeaders}</p>
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => copy(headers ? prettyJson(headers) : "")}
              >
                {dict.copy}
              </Button>
            </div>
            <pre className="text-xs font-mono rounded border p-3 max-h-48 overflow-auto whitespace-pre-wrap break-all">
              {headers ? prettyJson(headers) : "—"}
            </pre>
          </TabsContent>
          <TabsContent value="response" className="space-y-2">
            <p className="text-xs">
              {dict.status}: {delivery.statusCode ?? "—"} · {dict.attempts}: {delivery.attempts}
            </p>
            {delivery.errorMessage ? (
              <p className="text-xs text-destructive break-all">{delivery.errorMessage}</p>
            ) : null}
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => copy(delivery.responseBody ?? "")}
              >
                {dict.copy}
              </Button>
            </div>
            <pre className="text-xs font-mono rounded border p-3 max-h-64 overflow-auto whitespace-pre-wrap break-all">
              {delivery.responseBody ?? "—"}
            </pre>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
