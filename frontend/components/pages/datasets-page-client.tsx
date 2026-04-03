"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import type { Dictionary } from "@/app/[lang]/dictionaries"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { bffFetch, ClientHttpError } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/query-keys"
import type {
  DatasetDetail,
  DatasetListItem,
  DatasetRunDetail,
  DatasetRunListItem,
  EvaluationCriteria,
  PaginatedResult,
  Prompt,
} from "@/lib/api/types"
import {
  buildDatasetRunExportCsv,
  datasetRowsToCsv,
  parseDatasetCsv,
  parseRunSummary,
} from "@/lib/datasets/csv"

const CRITERIA_NONE = "__none__"

/** API limita `limit` a 20 (ListPromptsQueryDto); paginamos para carregar todos. */
async function fetchPromptsForDatasetRun(): Promise<PaginatedResult<Prompt>> {
  const pageSize = 20
  const first = await bffFetch<PaginatedResult<Prompt>>(`/prompts?page=1&limit=${pageSize}`)
  const all = [...first.data]
  for (let page = 2; page <= first.meta.totalPages; page++) {
    const res = await bffFetch<PaginatedResult<Prompt>>(
      `/prompts?page=${page}&limit=${pageSize}`,
    )
    all.push(...res.data)
  }
  return {
    data: all,
    meta: {
      page: 1,
      limit: all.length,
      total: all.length,
      totalPages: 1,
    },
  }
}

function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function statusBadgeVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "completed") return "default"
  if (status === "failed") return "destructive"
  if (status === "running") return "secondary"
  return "outline"
}

function EditDatasetForm({
  dataset,
  dict,
  onClose,
}: {
  dataset: DatasetDetail
  dict: Dictionary
  onClose: () => void
}) {
  const d = dict.datasetsPage
  const qc = useQueryClient()
  const [editName, setEditName] = useState(dataset.name)
  const [editCsv, setEditCsv] = useState(() =>
    datasetRowsToCsv(
      dataset.rows.map((r) => ({
        variables: r.variables,
        expectedOutput: r.expectedOutput,
      })),
    ),
  )

  const updateMutation = useMutation({
    mutationFn: () => {
      let rows
      try {
        rows = parseDatasetCsv(editCsv)
      } catch {
        throw new Error("csv")
      }
      return bffFetch<DatasetDetail>(`/datasets/${dataset.id}`, {
        method: "PATCH",
        body: { name: editName, rows },
      })
    },
    onSuccess: () => {
      toast.success(d.saveSuccess)
      void qc.invalidateQueries({ queryKey: queryKeys.datasets.list })
      void qc.invalidateQueries({ queryKey: queryKeys.datasets.detail(dataset.id) })
      onClose()
    },
    onError: (e) => {
      if (e instanceof Error && e.message === "csv") {
        toast.error(d.csvParseError)
        return
      }
      toast.error(e instanceof ClientHttpError ? e.message : d.saveError)
    },
  })

  return (
    <>
      <div className="grid gap-3 py-2">
        <div className="grid gap-2">
          <Label>{d.name}</Label>
          <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>{d.csvLabel}</Label>
          <Textarea
            rows={10}
            value={editCsv}
            onChange={(e) => setEditCsv(e.target.value)}
            className="font-mono text-sm"
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" className="cursor-pointer" onClick={onClose}>
          {dict.common.cancel}
        </Button>
        <Button
          type="button"
          className="cursor-pointer"
          disabled={updateMutation.isPending || !editName.trim()}
          onClick={() => updateMutation.mutate()}
        >
          {d.saveDataset}
        </Button>
      </DialogFooter>
    </>
  )
}

export function DatasetsPageClient({ dict, lang }: { dict: Dictionary; lang: string }) {
  const d = dict.datasetsPage
  const qc = useQueryClient()
  const [name, setName] = useState("")
  const [csv, setCsv] = useState("col1,col2\na,b")
  const [selectedDatasetId, setSelectedDatasetId] = useState("")
  const [selectedPromptId, setSelectedPromptId] = useState("")
  const [selectedCriteriaId, setSelectedCriteriaId] = useState(CRITERIA_NONE)
  const csvFileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)

  const [expandedDatasetId, setExpandedDatasetId] = useState<string | null>(null)
  const [focusedRun, setFocusedRun] = useState<{ datasetId: string; runId: string } | null>(null)
  const terminalToastKeyRef = useRef<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<DatasetListItem | null>(null)
  const [editTargetId, setEditTargetId] = useState<string | null>(null)

  const listQuery = useQuery({
    queryKey: queryKeys.datasets.list,
    queryFn: () => bffFetch<DatasetListItem[]>("/datasets"),
  })

  const promptsQuery = useQuery({
    queryKey: queryKeys.prompts.list("datasets-page"),
    queryFn: fetchPromptsForDatasetRun,
  })

  const criteriaQuery = useQuery({
    queryKey: queryKeys.settings.evaluationCriteria,
    queryFn: () => bffFetch<EvaluationCriteria[]>("/evaluation/criteria"),
  })

  const runsQuery = useQuery({
    queryKey: queryKeys.datasets.runs(expandedDatasetId ?? ""),
    queryFn: () => bffFetch<DatasetRunListItem[]>(`/datasets/${expandedDatasetId}/runs`),
    enabled: !!expandedDatasetId,
  })

  const focusedRunQuery = useQuery({
    queryKey: queryKeys.datasets.runDetail(focusedRun?.datasetId ?? "_", focusedRun?.runId ?? "_"),
    queryFn: () =>
      bffFetch<DatasetRunDetail>(`/datasets/${focusedRun!.datasetId}/runs/${focusedRun!.runId}`),
    enabled: !!focusedRun?.datasetId && !!focusedRun?.runId,
    refetchInterval: (q) => {
      const st = q.state.data?.status
      return st === "pending" || st === "running" ? 2000 : false
    },
  })

  const editDetailQuery = useQuery({
    queryKey: queryKeys.datasets.detail(editTargetId ?? ""),
    queryFn: () => bffFetch<DatasetDetail>(`/datasets/${editTargetId}`),
    enabled: !!editTargetId,
  })

  useEffect(() => {
    const r = focusedRunQuery.data
    if (!r) return
    if (r.status !== "completed" && r.status !== "failed") return
    const key = `${r.id}:${r.status}`
    if (terminalToastKeyRef.current === key) return
    terminalToastKeyRef.current = key
    if (r.status === "completed") {
      toast.success(d.runFinished)
    } else {
      toast.error(d.statusFailed)
    }
    void qc.invalidateQueries({ queryKey: queryKeys.datasets.list })
    void qc.invalidateQueries({ queryKey: queryKeys.datasets.runs(r.datasetId) })
  }, [focusedRunQuery.data, qc, d.runFinished, d.statusFailed])

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

  const onCsvDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.name.toLowerCase().endsWith(".csv")) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : ""
      setCsv(text)
      toast.success(d.importCsvSuccess)
    }
    reader.onerror = () => toast.error(d.importCsvError)
    reader.readAsText(file)
  }

  const createMutation = useMutation({
    mutationFn: () => {
      let rows
      try {
        rows = parseDatasetCsv(csv)
      } catch {
        throw new Error("csv")
      }
      if (rows.length === 0) {
        throw new Error("empty")
      }
      return bffFetch<DatasetDetail>("/datasets", { method: "POST", body: { name, rows } })
    },
    onSuccess: () => {
      toast.success(d.createSuccess)
      setName("")
      void qc.invalidateQueries({ queryKey: queryKeys.datasets.list })
    },
    onError: (e) => {
      if (e instanceof Error && e.message === "csv") {
        toast.error(d.csvParseError)
        return
      }
      if (e instanceof Error && e.message === "empty") {
        toast.error(d.csvParseError)
        return
      }
      toast.error(e instanceof ClientHttpError ? e.message : d.createError)
    },
  })

  const runMutation = useMutation({
    mutationFn: () => {
      const body: { criteriaId?: string } = {}
      if (selectedCriteriaId && selectedCriteriaId !== CRITERIA_NONE) {
        body.criteriaId = selectedCriteriaId
      }
      return bffFetch<DatasetRunListItem>(
        `/datasets/${selectedDatasetId}/run/${selectedPromptId}`,
        { method: "POST", body },
      )
    },
    onSuccess: (run) => {
      toast.info(d.runQueued)
      setFocusedRun({ datasetId: run.datasetId, runId: run.id })
      terminalToastKeyRef.current = null
      void qc.invalidateQueries({ queryKey: queryKeys.datasets.list })
      void qc.invalidateQueries({ queryKey: queryKeys.datasets.runs(run.datasetId) })
    },
    onError: (e) => toast.error(e instanceof ClientHttpError ? e.message : d.runError),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => bffFetch<void>(`/datasets/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success(d.deleteSuccess)
      setDeleteTarget(null)
      void qc.invalidateQueries({ queryKey: queryKeys.datasets.list })
    },
    onError: (e) => toast.error(e instanceof ClientHttpError ? e.message : d.deleteError),
  })

  const prompts = promptsQuery.data?.data ?? []
  const criteria = criteriaQuery.data ?? []
  const focusedSummary = parseRunSummary(focusedRunQuery.data?.results)

  const runStatusLabel = (s: string) => {
    if (s === "pending") return d.statusPending
    if (s === "running") return d.statusRunning
    if (s === "completed") return d.statusCompleted
    if (s === "failed") return d.statusFailed
    return s
  }

  const handleExportRun = async (datasetId: string, runId: string) => {
    try {
      const [run, dataset] = await Promise.all([
        bffFetch<DatasetRunDetail>(`/datasets/${datasetId}/runs/${runId}`),
        bffFetch<DatasetDetail>(`/datasets/${datasetId}`),
      ])
      const summary = parseRunSummary(run.results)
      const text = buildDatasetRunExportCsv({
        datasetRows: dataset.rows.map((r) => ({
          rowIndex: r.rowIndex,
          variables: r.variables,
          expectedOutput: r.expectedOutput,
        })),
        summary,
        executions: run.executions,
      })
      downloadTextFile(`dataset-run-${runId}.csv`, text, "text/csv;charset=utf-8")
      toast.success(d.exportSuccess)
    } catch (e) {
      toast.error(e instanceof ClientHttpError ? e.message : dict.common.error)
    }
  }

  const canRun =
    Boolean(selectedDatasetId) && Boolean(selectedPromptId) && !runMutation.isPending

  return (
    <TooltipProvider>
      <div className="grid gap-4 px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>{d.createTitle}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Label>{d.name}</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-muted-foreground underline decoration-dotted">
                      {d.helpCsvFormat}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">{d.helpCsvFormat}</TooltipContent>
                </Tooltip>
                <a
                  className="text-xs text-primary underline"
                  href="/samples/dataset-example.csv"
                  target="_blank"
                  rel="noreferrer"
                >
                  {d.exampleCsvLink}
                </a>
              </div>
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
              <div
                className={`rounded-md border border-dashed p-1 transition-colors ${dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/30"}`}
                onDragEnter={(e) => {
                  e.preventDefault()
                  setDragActive(true)
                }}
                onDragLeave={() => setDragActive(false)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={onCsvDrop}
              >
                <p className="px-2 pt-1 text-center text-xs text-muted-foreground">{d.csvDropHint}</p>
                <Textarea
                  rows={8}
                  value={csv}
                  onChange={(e) => setCsv(e.target.value)}
                  className="font-mono text-sm border-0 shadow-none focus-visible:ring-0"
                />
              </div>
            </div>
            <Button
              type="button"
              className="w-fit cursor-pointer"
              disabled={createMutation.isPending || !name.trim()}
              onClick={() => createMutation.mutate()}
            >
              {d.create}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{d.runTitle}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="grid min-w-[220px] flex-1 gap-2">
                <Label>{d.datasetLabel}</Label>
                <Select
                  value={selectedDatasetId || undefined}
                  onValueChange={setSelectedDatasetId}
                  disabled={!listQuery.data?.length}
                >
                  <SelectTrigger className="w-full min-w-[220px]">
                    <SelectValue placeholder={d.selectDataset} />
                  </SelectTrigger>
                  <SelectContent>
                    {listQuery.data?.map((ds) => (
                      <SelectItem key={ds.id} value={ds.id}>
                        {ds.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid min-w-[220px] flex-1 gap-2">
                <Label>{d.promptId}</Label>
                <Select
                  value={selectedPromptId || undefined}
                  onValueChange={setSelectedPromptId}
                  disabled={promptsQuery.isPending || promptsQuery.isError || !prompts.length}
                >
                  <SelectTrigger className="w-full min-w-[220px]">
                    <SelectValue placeholder={d.selectPrompt} />
                  </SelectTrigger>
                  <SelectContent>
                    {prompts.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {promptsQuery.isError ? (
                  <p className="text-xs text-destructive">{dict.common.error}</p>
                ) : null}
              </div>
              <div className="grid min-w-[220px] flex-1 gap-2">
                <Label>{d.criteriaOptional}</Label>
                <Select value={selectedCriteriaId} onValueChange={setSelectedCriteriaId}>
                  <SelectTrigger className="w-full min-w-[220px]">
                    <SelectValue placeholder={d.noCriteria} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={CRITERIA_NONE}>{d.noCriteria}</SelectItem>
                    {criteria.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                className="cursor-pointer"
                disabled={!canRun}
                onClick={() => runMutation.mutate()}
              >
                {d.run}
              </Button>
            </div>

            {focusedRunQuery.data ? (
              <div className="grid gap-3 rounded-lg border bg-muted/30 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-medium">{d.metricsTitle}</div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={statusBadgeVariant(focusedRunQuery.data.status)}>
                      {d.runStatus}: {runStatusLabel(focusedRunQuery.data.status)}
                    </Badge>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="cursor-pointer"
                      onClick={() =>
                        handleExportRun(focusedRunQuery.data!.datasetId, focusedRunQuery.data!.id)
                      }
                    >
                      {d.exportCsv}
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="cursor-pointer" asChild>
                      <Link href={`/${lang}/prompts/${focusedRunQuery.data.promptId}`}>
                        {d.openPrompt}
                      </Link>
                    </Button>
                  </div>
                </div>
                {focusedSummary ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                    <div className="rounded border bg-background p-2 text-center">
                      <div className="text-xs text-muted-foreground">{d.metricTotal}</div>
                      <div className="text-lg font-semibold">{focusedSummary.total}</div>
                    </div>
                    <div className="rounded border bg-background p-2 text-center">
                      <div className="text-xs text-muted-foreground">{d.metricSuccess}</div>
                      <div className="text-lg font-semibold text-green-600">{focusedSummary.success}</div>
                    </div>
                    <div className="rounded border bg-background p-2 text-center">
                      <div className="text-xs text-muted-foreground">{d.metricFailed}</div>
                      <div className="text-lg font-semibold text-destructive">{focusedSummary.failed}</div>
                    </div>
                    <div className="rounded border bg-background p-2 text-center">
                      <div className="text-xs text-muted-foreground">{d.metricExpected}</div>
                      <div className="text-lg font-semibold">
                        {focusedSummary.expectedCompared != null && focusedSummary.expectedCompared > 0
                          ? `${focusedSummary.expectedMatches ?? 0}/${focusedSummary.expectedCompared}`
                          : d.na}
                      </div>
                    </div>
                    <div className="rounded border bg-background p-2 text-center">
                      <div className="text-xs text-muted-foreground">{d.metricJudgeAvg}</div>
                      <div className="text-lg font-semibold">
                        {focusedSummary.averageJudgeScore != null
                          ? focusedSummary.averageJudgeScore.toFixed(1)
                          : d.na}
                      </div>
                    </div>
                  </div>
                ) : null}

                {focusedSummary?.results?.length ? (
                  <div className="overflow-x-auto">
                    <div className="mb-1 text-sm font-medium">{d.resultsTitle}</div>
                    <table className="w-full min-w-[640px] border-collapse text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="p-2">#</th>
                          <th className="p-2">ok</th>
                          <th className="p-2">{d.outputPreview}</th>
                          <th className="p-2">expected</th>
                          <th className="p-2">{d.metricJudgeAvg}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {focusedSummary.results.map((rr) => {
                          const ex = focusedRunQuery.data?.executions.find((e) => e.id === rr.executionId)
                          const out = ex?.output ?? ""
                          const preview = out.length > 120 ? `${out.slice(0, 120)}…` : out
                          const expMatch =
                            rr.expectedMatch === null || rr.expectedMatch === undefined
                              ? d.na
                              : rr.expectedMatch
                                ? d.yes
                                : d.no
                          return (
                            <tr key={rr.rowIndex} className="border-b">
                              <td className="p-2 font-mono text-xs">{rr.rowIndex}</td>
                              <td className="p-2">
                                {rr.ok ? (
                                  <Badge variant="default">{d.yes}</Badge>
                                ) : (
                                  <Badge variant="destructive">{d.no}</Badge>
                                )}
                              </td>
                              <td className="max-w-[280px] p-2 font-mono text-xs whitespace-pre-wrap">
                                {preview || d.na}
                              </td>
                              <td className="p-2 text-xs">{expMatch}</td>
                              <td className="p-2 text-xs">
                                {rr.judgeScore != null ? String(rr.judgeScore) : d.na}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{d.title}</CardTitle>
          </CardHeader>
          <CardContent>
            {listQuery.isPending ? (
              <p className="text-sm text-muted-foreground">{d.loading}</p>
            ) : null}
            {listQuery.isError ? (
              <p className="text-sm text-destructive">{dict.common.error}</p>
            ) : null}
            {!listQuery.data?.length ? (
              <p className="text-sm text-muted-foreground">{d.empty}</p>
            ) : null}
            <ul className="grid gap-2 text-sm">
              {listQuery.data?.map((ds) => (
                <li key={ds.id} className="rounded border p-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <span className="font-medium">{ds.name}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        — {ds.rowCount} {d.rows}, {ds._count.runs} {d.runs}
                      </span>
                      <div className="font-mono text-xs text-muted-foreground">{ds.id}</div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
                        onClick={() => setExpandedDatasetId((cur) => (cur === ds.id ? null : ds.id))}
                      >
                        {expandedDatasetId === ds.id ? d.collapseRuns : d.expandRuns}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
                        onClick={() => setEditTargetId(ds.id)}
                      >
                        {d.editDataset}
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="cursor-pointer"
                        onClick={() => setDeleteTarget(ds)}
                      >
                        {d.deleteDataset}
                      </Button>
                    </div>
                  </div>
                  {expandedDatasetId === ds.id ? (
                    <div className="mt-3 border-t pt-3">
                      {runsQuery.isPending ? (
                        <p className="text-xs text-muted-foreground">{d.loading}</p>
                      ) : null}
                      {!runsQuery.data?.length ? (
                        <p className="text-xs text-muted-foreground">{d.empty}</p>
                      ) : (
                        <ul className="grid gap-1">
                          {runsQuery.data.map((run) => (
                            <li
                              key={run.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded bg-muted/40 px-2 py-1"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={statusBadgeVariant(run.status)}>
                                  {runStatusLabel(run.status)}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {run.prompt.title} · {new Date(run.createdAt).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="cursor-pointer h-7"
                                  onClick={() => setFocusedRun({ datasetId: ds.id, runId: run.id })}
                                >
                                  {d.viewDetails}
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="cursor-pointer h-7"
                                  onClick={() => void handleExportRun(ds.id, run.id)}
                                >
                                  {d.exportCsv}
                                </Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{d.deleteConfirmTitle}</AlertDialogTitle>
              <AlertDialogDescription>{d.deleteConfirmDescription}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="cursor-pointer">{dict.common.cancel}</AlertDialogCancel>
              <AlertDialogAction
                className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              >
                {dict.common.delete}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={!!editTargetId} onOpenChange={(o) => !o && setEditTargetId(null)}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{d.editTitle}</DialogTitle>
            </DialogHeader>
            {editDetailQuery.isPending ? (
              <p className="text-sm text-muted-foreground py-4">{d.loading}</p>
            ) : editDetailQuery.data && editTargetId === editDetailQuery.data.id ? (
              <EditDatasetForm
                key={editTargetId}
                dataset={editDetailQuery.data}
                dict={dict}
                onClose={() => setEditTargetId(null)}
              />
            ) : (
              <p className="text-sm text-muted-foreground py-4">{dict.common.error}</p>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
