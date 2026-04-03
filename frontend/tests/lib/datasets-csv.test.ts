import { describe, expect, it } from "vitest"
import {
  buildDatasetRunExportCsv,
  datasetRowsToCsv,
  parseDatasetCsv,
  parseRunSummary,
} from "@/lib/datasets/csv"

describe("parseDatasetCsv", () => {
  it("parses header and rows", () => {
    const rows = parseDatasetCsv("a,b\n1,2\n3,4")
    expect(rows).toEqual([{ variables: { a: "1", b: "2" } }, { variables: { a: "3", b: "4" } }])
  })

  it("extracts expected_output into expectedOutput", () => {
    const rows = parseDatasetCsv("topic,expected_output\nhello,world")
    expect(rows).toEqual([{ variables: { topic: "hello" }, expectedOutput: "world" }])
  })
})

describe("datasetRowsToCsv", () => {
  it("round-trips variables", () => {
    const csv = datasetRowsToCsv([{ variables: { x: "1", y: "2" } }])
    expect(csv).toBe("x,y\n1,2")
  })
})

describe("parseRunSummary + buildDatasetRunExportCsv", () => {
  it("builds export with execution mapping", () => {
    const summary = {
      total: 1,
      success: 1,
      failed: 0,
      results: [{ rowIndex: 0, executionId: "e1", ok: true, expectedMatch: true }],
    }
    expect(parseRunSummary(summary)?.total).toBe(1)
    const csv = buildDatasetRunExportCsv({
      datasetRows: [{ rowIndex: 0, variables: { a: "1" }, expectedOutput: "x" }],
      summary: parseRunSummary(summary),
      executions: [
        {
          id: "e1",
          output: "out",
          latencyMs: 10,
          totalTokens: 20,
          estimatedCost: 0.001,
        },
      ],
    })
    expect(csv).toContain("row_index")
    expect(csv).toContain("e1")
    expect(csv).toContain("out")
  })
})
