import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { bffFetch, ClientHttpError } from "../../lib/api/client"

describe("bffFetch", () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it("GET chama /api/bff com credentials", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    )
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const data = await bffFetch<{ ok: boolean }>("/prompts")

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/bff/prompts",
      expect.objectContaining({
        method: "GET",
        credentials: "include",
        headers: expect.objectContaining({
          "content-type": "application/json",
        }),
        body: undefined,
      }),
    )
    expect(data.ok).toBe(true)
  })

  it("POST envia body JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "1" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    )
    globalThis.fetch = fetchMock as unknown as typeof fetch

    await bffFetch("/prompts", { method: "POST", body: { title: "t" } })

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/bff/prompts",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ title: "t" }),
      }),
    )
  })

  it("lança ClientHttpError quando resposta não ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "erro", code: "X" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    )
    globalThis.fetch = fetchMock as unknown as typeof fetch

    try {
      await bffFetch("/x")
      expect.fail("deveria lançar ClientHttpError")
    } catch (e) {
      expect(e).toBeInstanceOf(ClientHttpError)
      if (e instanceof ClientHttpError) {
        expect(e.status).toBe(401)
        expect(e.payload.message).toBe("erro")
      }
    }
  })

  it("204 retorna undefined", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const result = await bffFetch<undefined>("/x", { method: "DELETE" })
    expect(result).toBeUndefined()
  })
})
