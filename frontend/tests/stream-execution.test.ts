import { describe, expect, it, vi } from "vitest"
import { runExecutionStream } from "../lib/features/executions/stream-execution"

function makeSseResponse(blocks: string[]) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      blocks.forEach((block) => controller.enqueue(encoder.encode(block)))
      controller.close()
    },
  })
  return new Response(stream, {
    status: 200,
    headers: {
      "content-type": "text/event-stream",
    },
  })
}

describe("runExecutionStream", () => {
  it("streams chunk events in order", async () => {
    const onChunk = vi.fn()
    const onErrorMessage = vi.fn()

    await runExecutionStream({
      input: "hello",
      signal: new AbortController().signal,
      fetchExecution: async () =>
        makeSseResponse([
          'event: chunk\ndata: {"content":"Hello "}\n\n',
          'event: chunk\ndata: {"content":"world"}\n\n',
        ]),
      onChunk,
      onErrorMessage,
    })

    expect(onChunk).toHaveBeenCalledTimes(2)
    expect(onChunk).toHaveBeenNthCalledWith(1, "Hello ")
    expect(onChunk).toHaveBeenNthCalledWith(2, "world")
    expect(onErrorMessage).not.toHaveBeenCalled()
  })

  it("retries on initial failed response and then succeeds", async () => {
    const onChunk = vi.fn()
    const onErrorMessage = vi.fn()
    const fetchExecution = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(makeSseResponse(['event: chunk\ndata: {"content":"ok"}\n\n']))

    await runExecutionStream({
      input: "retry",
      signal: new AbortController().signal,
      fetchExecution,
      onChunk,
      onErrorMessage,
      maxRetries: 2,
    })

    expect(fetchExecution).toHaveBeenCalledTimes(2)
    expect(onChunk).toHaveBeenCalledWith("ok")
    // Primeira resposta 500 dispara mensagem de erro antes do retry
    expect(onErrorMessage).toHaveBeenCalledWith("Falha na execucao")
  })

  it("throws AbortError when aborted", async () => {
    const onChunk = vi.fn()
    const onErrorMessage = vi.fn()
    const controller = new AbortController()
    controller.abort()

    await expect(
      runExecutionStream({
        input: "abort",
        signal: controller.signal,
        fetchExecution: async (_input, signal) => {
          if (signal.aborted) {
            throw new DOMException("Aborted", "AbortError")
          }
          return new Response(null, { status: 200 })
        },
        onChunk,
        onErrorMessage,
      }),
    ).rejects.toThrowError(/Aborted/)
  })

  it("maps error events to onErrorMessage and fails", async () => {
    const onChunk = vi.fn()
    const onErrorMessage = vi.fn()

    await expect(
      runExecutionStream({
        input: "error-event",
        signal: new AbortController().signal,
        fetchExecution: async () =>
          makeSseResponse(['event: error\ndata: {"message":"provider error"}\n\n']),
        onChunk,
        onErrorMessage,
        maxRetries: 0,
      }),
    ).rejects.toThrowError(/execute_error/)

    expect(onErrorMessage).toHaveBeenCalledWith("provider error")
  })

  it("ignores malformed chunk payloads without failing stream", async () => {
    const onChunk = vi.fn()
    const onErrorMessage = vi.fn()

    await runExecutionStream({
      input: "malformed",
      signal: new AbortController().signal,
      fetchExecution: async () =>
        makeSseResponse([
          "event: chunk\ndata: {invalid-json}\n\n",
          'event: chunk\ndata: {"content":"valid"}\n\n',
        ]),
      onChunk,
      onErrorMessage,
      maxRetries: 0,
    })

    expect(onChunk).toHaveBeenCalledTimes(1)
    expect(onChunk).toHaveBeenCalledWith("valid")
    expect(onErrorMessage).not.toHaveBeenCalled()
  })
})
