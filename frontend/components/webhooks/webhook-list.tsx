"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import type { WebhookDeliveryItem, WebhookItem } from "@/lib/api/types"
import type { Dictionary } from "@/app/[lang]/dictionaries"
import { formatDateTimeLocale } from "@/lib/format-datetime"

type Dict = Dictionary["webhooksPage"]

function statusTone(code: number | null | undefined): "default" | "secondary" | "destructive" | "outline" {
  if (code == null) return "secondary"
  if (code === 0) return "destructive"
  if (code >= 200 && code < 300) return "default"
  return "destructive"
}

type Props = {
  dict: Dict
  lang: string
  items: WebhookItem[]
  empty: boolean
  filterEmpty: boolean
  openDeliveriesId: string | null
  onToggleDeliveries: (id: string | null) => void
  deliveries: WebhookDeliveryItem[] | undefined
  deliveriesLoading: boolean
  onDelete: (id: string) => void
  onToggleActive: (w: WebhookItem, next: boolean) => void
  onEdit: (w: WebhookItem) => void
  onTest: (w: WebhookItem) => void
  onDeliveryOpenDetail: (d: WebhookDeliveryItem) => void
  toggleActivePendingId: string | null
}

export function WebhookList({
  dict,
  lang,
  items,
  empty,
  filterEmpty,
  openDeliveriesId,
  onToggleDeliveries,
  deliveries,
  deliveriesLoading,
  onDelete,
  onToggleActive,
  onEdit,
  onTest,
  onDeliveryOpenDetail,
  toggleActivePendingId,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.listTitle}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {empty ? <p className="text-sm text-muted-foreground">{dict.empty}</p> : null}
        {!empty && filterEmpty ? (
          <p className="text-sm text-muted-foreground">{dict.filterNoResults}</p>
        ) : null}
        {items.map((w) => (
          <div key={w.id} className="rounded border p-3 text-sm space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                {w.name ? <p className="font-medium truncate">{w.name}</p> : null}
                <span className="break-all font-mono text-xs block">{w.url}</span>
                <div className="flex flex-wrap gap-1 pt-1">
                  {w.events.slice(0, 6).map((ev) => (
                    <Badge key={ev} variant="secondary" className="text-[10px] font-mono">
                      {ev}
                    </Badge>
                  ))}
                  {w.events.length > 6 ? (
                    <Badge variant="outline" className="text-[10px]">
                      +{w.events.length - 6}
                    </Badge>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {dict.metaRetries}: {w.retryCount} · {dict.metaTimeout}: {w.timeoutMs}ms
                  {w.failureCount > 0 ? (
                    <span className="text-destructive"> · {dict.failures}: {w.failureCount}</span>
                  ) : null}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <div className="flex items-center gap-2 border rounded-md px-2 py-1">
                  <span className="text-xs text-muted-foreground">{dict.active}</span>
                  <Switch
                    checked={w.isActive}
                    disabled={toggleActivePendingId === w.id}
                    onCheckedChange={(v) => onToggleActive(w, v)}
                  />
                </div>
                <Button type="button" size="sm" variant="outline" className="cursor-pointer" onClick={() => onEdit(w)}>
                  {dict.edit}
                </Button>
                <Button type="button" size="sm" variant="outline" className="cursor-pointer" onClick={() => onTest(w)}>
                  {dict.test}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => onToggleDeliveries(openDeliveriesId === w.id ? null : w.id)}
                >
                  {dict.deliveries}
                </Button>
                <Button type="button" size="sm" variant="destructive" className="cursor-pointer" onClick={() => onDelete(w.id)}>
                  ×
                </Button>
              </div>
            </div>
            {openDeliveriesId === w.id ? (
              <ul className="max-h-48 overflow-auto border-t pt-2 text-xs space-y-1">
                {deliveriesLoading ? <li>{dict.loadingDeliveries}</li> : null}
                {!deliveriesLoading && !deliveries?.length ? <li>{dict.noDeliveries}</li> : null}
                {deliveries?.map((del) => (
                  <li key={del.id} className="flex flex-wrap items-center gap-2 justify-between">
                    <span>
                      {del.event} ·{" "}
                      <Badge variant={statusTone(del.statusCode)} className="text-[10px]">
                        {del.statusCode ?? "?"}
                      </Badge>{" "}
                      · {formatDateTimeLocale(del.createdAt, lang)}
                    </span>
                    <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={() => onDeliveryOpenDetail(del)}>
                      {dict.deliveryDetails}
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
