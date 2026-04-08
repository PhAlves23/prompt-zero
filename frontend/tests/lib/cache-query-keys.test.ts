import { describe, expect, it } from "vitest"
import { queryKeys } from "@/lib/api/query-keys"

describe("queryKeys cache", () => {
  it("config e stats usam workspace e período", () => {
    expect(queryKeys.cache.config("ws-1")).toEqual(["cache", "config", "ws-1"])
    expect(queryKeys.cache.stats("ws-1", "7d")).toEqual(["cache", "stats", "ws-1", "7d"])
  })

  it("analytics cache inclui workspace opcional", () => {
    expect(queryKeys.analytics.cacheStats("30d")).toEqual(["analytics", "cache-stats", "30d", "all"])
    expect(queryKeys.analytics.cacheStats("30d", "ws-9")).toEqual([
      "analytics",
      "cache-stats",
      "30d",
      "ws-9",
    ])
  })
})
