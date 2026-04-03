"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { bffFetch, ClientHttpError } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/query-keys"
import type { DatasetDetail, DatasetListItem } from "@/lib/api/types"
import type { Dictionary } from "@/app/[lang]/dictionaries"

function parseSimpleCsv(text: string): { variables: Record<string, string> }[] {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(",").map((h) => h.trim())
  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim())
    const variables: Record<string, string> = {}
    headers.forEach((h, i) => {
      variables[h] = cells[i] ?? ""
    })
    return { variables }
  })
}

export function DatasetsPageClient({ dict }: { dict: Dictionary }) {
  const d = dict.datasetsPage
  const qc = useQueryClient()
  const [name, setName] = useState("")
  const [csv, setCsv] = useState("col1,col2\na,b")
  const [runDatasetId, setRunDatasetId] = useState("")
  const [runPromptId, setRunPromptId] = useState("")
  const csvFileInputRef = useRef<HTMLInputElement>(null)

  const onCsvFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : ""
      setCsv(text)
      toast.success(d.importCsvSuccess)
    }
    reader.onerror = () => toast.error(d.importCsvError)
    reader.readAsText(file)
  }

  const listQuery = useQuery({
    queryKey: queryKeys.datasets.list,
    queryFn: () => bffFetch<DatasetListItem[]>("/datasets"),
  })

  const createMutation = useMutation({
    mutationFn: () => {
      const rows = parseSimpleCsv(csv)
      return bffFetch<DatasetDetail>("/datasets", { method: "POST", body: { name, rows } })
    },
    onSuccess: () => {
      toast.success("OK")
      setName("")
      void qc.invalidateQueries({ queryKey: queryKeys.datasets.list })
    },
    onError: (e) => toast.error(e instanceof ClientHttpError ? e.message : "Error"),
  })

  const runMutation = useMutation({
    mutationFn: () => bffFetch<unknown>(`/datasets/${runDatasetId}/run/${runPromptId}`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Batch started")
      void qc.invalidateQueries({ queryKey: queryKeys.datasets.list })
    },
    onError: (e) => toast.error(e instanceof ClientHttpError ? e.message : "Error"),
  })

  return (
    <div className="grid gap-4 px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>{d.createTitle}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-2">
            <Label>{d.name}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="shrink-0">{d.csvLabel}</Label>
              <input
                ref={csvFileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={onCsvFileSelected}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer shrink-0"
                onClick={() => csvFileInputRef.current?.click()}
              >
                {d.importCsv}
              </Button>
            </div>
            <Textarea rows={8} value={csv} onChange={(e) => setCsv(e.target.value)} className="font-mono text-sm" />
          </div>
          <Button type="button" className="w-fit cursor-pointer" disabled={createMutation.isPending || !name.trim()} onClick={() => createMutation.mutate()}>
            {d.create}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{d.runTitle}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-2">
          <div className="grid gap-1">
            <Label className="text-xs">Dataset ID</Label>
            <Input value={runDatasetId} onChange={(e) => setRunDatasetId(e.target.value)} className="min-w-[220px]" />
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">{d.promptId}</Label>
            <Input value={runPromptId} onChange={(e) => setRunPromptId(e.target.value)} className="min-w-[220px]" />
          </div>
          <Button
            type="button"
            className="cursor-pointer"
            disabled={runMutation.isPending || !runDatasetId || !runPromptId}
            onClick={() => runMutation.mutate()}
          >
            {d.run}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{d.title}</CardTitle>
        </CardHeader>
        <CardContent>
          {listQuery.isPending ? <p className="text-sm text-muted-foreground">…</p> : null}
          {!listQuery.data?.length ? <p className="text-sm text-muted-foreground">{d.empty}</p> : null}
          <ul className="grid gap-2 text-sm">
            {listQuery.data?.map((ds) => (
              <li key={ds.id} className="rounded border p-2">
                <span className="font-medium">{ds.name}</span>
                <span className="text-muted-foreground">
                  {" "}
                  — {ds.rowCount} {d.rows}, {ds._count.runs} {d.runs}
                </span>
                <div className="font-mono text-xs text-muted-foreground">{ds.id}</div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
