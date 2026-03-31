import { describe, expect, it } from "vitest"
import { cn } from "../../lib/utils"

describe("cn", () => {
  it("combina classes e resolve conflitos Tailwind (tailwind-merge)", () => {
    expect(cn("px-2 py-1", "px-4")).toContain("px-4")
    expect(cn("px-2 py-1", "px-4")).not.toMatch(/px-2/)
  })

  it("ignora valores falsy", () => {
    expect(cn("a", false, undefined, "b")).toBe("a b")
  })
})
