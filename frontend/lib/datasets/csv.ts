import Papa from "papaparse"

export type DatasetRowInput = {
  variables: Record<string, string>
  expectedOutput?: string
}

const EXPECTED_HEADERS = ["expected_output", "expectedOutput"] as const

export function parseDatasetCsv(text: string): DatasetRowInput[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  const parsed = Papa.parse<Record<string, string>>(trimmed, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  })

  const critical = parsed.errors.filter((e) => e.type === "Quotes" || e.type === "Delimiter")
  if (critical.length > 0) {
    throw new Error(critical[0]?.message ?? "CSV inválido")
  }

  const rows = parsed.data.filter((row) =>
    Object.keys(row).some((k) => (row[k] ?? "").trim() !== ""),
  )

  return rows.map((row) => {
    const variables: Record<string, string> = { ...row }
    let expectedOutput: string | undefined

    for (const key of EXPECTED_HEADERS) {
      const raw = variables[key]
      if (raw != null && String(raw).trim() !== "") {
        expectedOutput = String(raw).trim()
        delete variables[key]
        break
      }
    }

    return expectedOutput !== undefined ? { variables, expectedOutput } : { variables }
  })
}

export function datasetRowsToCsv(
  rows: Array<{ variables: Record<string, unknown>; expectedOutput?: string | null }>,
): string {
  if (rows.length === 0) return ""

  const varKeys = new Set<string>()
  for (const r of rows) {
    Object.keys(r.variables ?? {}).forEach((k) => varKeys.add(k))
  }
  const sortedKeys = [...varKeys].sort()
  const anyExpected = rows.some((r) => (r.expectedOutput ?? "").trim() !== "")
  const headers = anyExpected ? [...sortedKeys, "expected_output"] : sortedKeys

  const lines = [headers.join(",")]
  for (const r of rows) {
    const cells = headers.map((h) => {
      if (h === "expected_output") {
        return escapeCsvCell(r.expectedOutput ?? "")
      }
      const v = r.variables[h]
      return escapeCsvCell(v == null ? "" : String(v))
    })
    lines.push(cells.join(","))
  }
  return lines.join("\n")
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function parseRunSummary(results: unknown): DatasetRunResultsSummary | null {
  if (!results || typeof results !== "object") return null
  const o = results as Record<string, unknown>
  if (!Array.isArray(o.results)) return null
  return results as DatasetRunResultsSummary
}

export type DatasetRunResultsSummary = {
  total: number
  success: number
  failed: number
  expectedCompared?: number
  expectedMatches?: number
  averageJudgeScore?: number | null
  results: Array<{
    rowIndex: number
    executionId: string
    ok: boolean
    expectedMatch: boolean | null
    judgeScore?: number | null
    judgeError?: boolean
  }>
}

export function buildDatasetRunExportCsv(args: {
  datasetRows: Array<{ rowIndex: number; variables: Record<string, unknown>; expectedOutput?: string | null }>
  summary: DatasetRunResultsSummary | null
  executions: Array<{
    id: string
    output: string | null
    latencyMs: number | null
    totalTokens: number | null
    estimatedCost: number | null
  }>
}): string {
  const execById = new Map(args.executions.map((e) => [e.id, e]))
  const varKeys = new Set<string>()
  for (const r of args.datasetRows) {
    Object.keys(r.variables ?? {}).forEach((k) => varKeys.add(k))
  }
  const sortedKeys = [...varKeys].sort()
  const headers = [
    ...sortedKeys,
    "row_index",
    "ok",
    "execution_id",
    "output",
    "latency_ms",
    "total_tokens",
    "estimated_cost",
    "expected_output",
    "expected_match",
    "judge_score",
  ]

  const resultByRow = new Map<number, DatasetRunResultsSummary["results"][0]>()
  if (args.summary?.results) {
    for (const rr of args.summary.results) {
      resultByRow.set(rr.rowIndex, rr)
    }
  }

  const lines = [headers.join(",")]
  for (const row of args.datasetRows) {
    const rr = resultByRow.get(row.rowIndex)
    const ex = rr?.executionId ? execById.get(rr.executionId) : undefined
    const cells = headers.map((h) => {
      switch (h) {
        case "row_index":
          return String(row.rowIndex)
        case "ok":
          return rr ? String(rr.ok) : ""
        case "execution_id":
          return rr?.executionId ?? ""
        case "output":
          return escapeCsvCell(ex?.output ?? "")
        case "latency_ms":
          return ex?.latencyMs != null ? String(ex.latencyMs) : ""
        case "total_tokens":
          return ex?.totalTokens != null ? String(ex.totalTokens) : ""
        case "estimated_cost":
          return ex?.estimatedCost != null ? String(ex.estimatedCost) : ""
        case "expected_output":
          return escapeCsvCell(row.expectedOutput ?? "")
        case "expected_match":
          return rr?.expectedMatch === null || rr?.expectedMatch === undefined
            ? ""
            : String(rr.expectedMatch)
        case "judge_score":
          return rr?.judgeScore != null && rr.judgeScore !== undefined ? String(rr.judgeScore) : ""
        default:
          return escapeCsvCell(row.variables[h] == null ? "" : String(row.variables[h]))
      }
    })
    lines.push(cells.join(","))
  }
  return lines.join("\n")
}
