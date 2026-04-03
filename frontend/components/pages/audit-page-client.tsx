"use client"

import { Fragment, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ChevronDown, Copy } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { bffFetch } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/query-keys"
import type { AuditLogEntry } from "@/lib/api/types"
import type { Dictionary } from "@/app/[lang]/dictionaries"
import { formatDateTimeLocale } from "@/lib/format-datetime"
import { cn } from "@/lib/utils"

function auditActionLabel(action: string, d: Dictionary["auditPage"]) {
  switch (action.toLowerCase()) {
    case "create":
      return d.actionCreate
    case "update":
      return d.actionUpdate
    case "delete":
      return d.actionDelete
    default:
      return d.actionOther
  }
}

function auditActionStyles(action: string) {
  switch (action.toLowerCase()) {
    case "create":
      return {
        row: "border-l-[3px] border-l-emerald-500/70 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.07]",
        badge:
          "border border-emerald-500/35 bg-emerald-500/12 text-emerald-800 dark:text-emerald-300",
      }
    case "update":
      return {
        row: "border-l-[3px] border-l-sky-500/70 bg-sky-500/[0.04] dark:bg-sky-500/[0.08]",
        badge:
          "border border-sky-500/35 bg-sky-500/12 text-sky-900 dark:text-sky-200",
      }
    case "delete":
      return {
        row: "border-l-[3px] border-l-destructive/70 bg-destructive/[0.04] dark:bg-destructive/[0.08]",
        badge: "",
      }
    default:
      return {
        row: "border-l-[3px] border-l-muted-foreground/25 bg-muted/30",
        badge: "border border-border bg-muted/80 text-muted-foreground",
      }
  }
}

function hasReadableMetadata(meta: unknown): meta is Record<string, unknown> {
  if (meta === null || typeof meta !== "object" || Array.isArray(meta)) {
    return false
  }
  return Object.keys(meta as object).length > 0
}

const COL_COUNT = 5

export function AuditPageClient({ lang, dict }: { lang: string; dict: Dictionary }) {
  const d = dict.auditPage
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const listQuery = useQuery({
    queryKey: queryKeys.audit.list("default"),
    queryFn: () => bffFetch<AuditLogEntry[]>("/audit-logs?take=100"),
  })

  function toggleExpanded(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  async function copyMetadata(metadata: unknown) {
    if (!hasReadableMetadata(metadata)) {
      return
    }
    const text = JSON.stringify(metadata, null, 2)
    try {
      await navigator.clipboard.writeText(text)
      toast.success(d.copiedContext)
    } catch {
      toast.error(d.copyContextFailed)
    }
  }

  return (
    <div className="grid gap-4 px-4 lg:px-6">
      <Card className="overflow-hidden border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
          <CardTitle className="text-lg tracking-tight">{d.title}</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-0">
          {listQuery.isPending ? (
            <p className="p-6 text-sm text-muted-foreground">{d.loading}</p>
          ) : null}
          {!listQuery.isPending && !listQuery.data?.length ? (
            <p className="p-6 text-sm text-muted-foreground">{d.empty}</p>
          ) : null}
          {listQuery.data?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/30 text-xs font-medium text-muted-foreground">
                    <th className="px-4 py-3 pl-5">{d.when}</th>
                    <th className="px-3 py-3">{d.action}</th>
                    <th className="min-w-48 px-3 py-3">{d.resource}</th>
                    <th className="hidden px-3 py-3 sm:table-cell">{d.ip}</th>
                    <th className="px-4 py-3 pr-5 text-right">{d.details}</th>
                  </tr>
                </thead>
                <tbody>
                  {listQuery.data.map((row) => {
                    const styles = auditActionStyles(row.action)
                    const isDelete = row.action.toLowerCase() === "delete"
                    const isOpen = Boolean(expanded[row.id])
                    const metaOk = hasReadableMetadata(row.metadata)
                    const json = metaOk ? JSON.stringify(row.metadata, null, 2) : ""

                    return (
                      <Fragment key={row.id}>
                        <tr
                          className={cn(
                            "border-b border-border/50 transition-colors hover:bg-muted/25",
                            styles.row,
                            isOpen && "border-b-0",
                          )}
                        >
                          <td className="px-4 py-3 pl-5 align-middle whitespace-nowrap text-muted-foreground tabular-nums">
                            {formatDateTimeLocale(row.timestamp, lang)}
                          </td>
                          <td className="px-3 py-3 align-middle">
                            {isDelete ? (
                              <Badge variant="destructive" className="font-medium capitalize">
                                {auditActionLabel(row.action, d)}
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className={cn("font-medium capitalize shadow-none", styles.badge)}
                              >
                                {auditActionLabel(row.action, d)}
                              </Badge>
                            )}
                          </td>
                          <td className="px-3 py-3 align-middle">
                            <code className="rounded-md bg-background/80 px-2 py-1 text-xs leading-snug ring-1 ring-border/80">
                              {row.resource}
                            </code>
                          </td>
                          <td className="hidden max-w-36 truncate px-3 py-3 align-middle text-xs text-muted-foreground sm:table-cell">
                            {row.ipAddress ?? "—"}
                          </td>
                          <td className="px-4 py-3 pr-5 text-right align-middle">
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              className="h-8 gap-1.5 font-normal"
                              aria-expanded={isOpen}
                              aria-label={d.toggleContext}
                              onClick={() => toggleExpanded(row.id)}
                            >
                              <ChevronDown
                                className={cn(
                                  "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                                  isOpen && "rotate-180",
                                )}
                              />
                              <span className="hidden sm:inline">{d.viewDetails}</span>
                            </Button>
                          </td>
                        </tr>
                        {isOpen ? (
                          <tr
                            className={cn(
                              "border-b border-border/50 last:border-0",
                              styles.row,
                            )}
                          >
                            <td colSpan={COL_COUNT} className="px-4 pb-4 pl-5 pr-5 pt-0">
                              <div
                                className={cn(
                                  "rounded-lg border border-border/80 bg-background/90 p-3 shadow-sm ring-1 ring-border/40",
                                  "dark:bg-background/50",
                                )}
                              >
                                <div className="mb-2 flex flex-wrap items-center justify-end gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="xs"
                                    className="h-7 gap-1.5"
                                    disabled={!metaOk}
                                    onClick={() => void copyMetadata(row.metadata)}
                                  >
                                    <Copy className="size-3.5" />
                                    {d.copyContext}
                                  </Button>
                                </div>
                                {metaOk ? (
                                  <pre className="max-h-[min(50vh,20rem)] overflow-auto rounded-md bg-muted/40 p-3 text-xs leading-relaxed font-mono whitespace-pre-wrap break-all">
                                    {json}
                                  </pre>
                                ) : (
                                  <p className="rounded-md bg-muted/30 px-3 py-4 text-center text-sm text-muted-foreground">
                                    {d.contextEmpty}
                                  </p>
                                )}
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
