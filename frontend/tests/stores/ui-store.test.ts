import { describe, expect, it, beforeEach } from "vitest"
import { useUiStore } from "../../stores/ui-store"

describe("useUiStore", () => {
  beforeEach(() => {
    useUiStore.setState({ selectedPeriod: "30d" })
  })

  it("inicia com período 30d", () => {
    expect(useUiStore.getState().selectedPeriod).toBe("30d")
  })

  it("setSelectedPeriod atualiza o período", () => {
    useUiStore.getState().setSelectedPeriod("7d")
    expect(useUiStore.getState().selectedPeriod).toBe("7d")
    useUiStore.getState().setSelectedPeriod("90d")
    expect(useUiStore.getState().selectedPeriod).toBe("90d")
  })
})
