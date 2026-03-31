export type ExecutionFetch = (
  input: string,
  signal: AbortSignal,
) => Promise<Response>

export type ExecutionStreamOptions = {
  input: string
  signal: AbortSignal
  maxRetries?: number
  fetchExecution: ExecutionFetch
  onChunk: (content: string) => void
  onErrorMessage: (message: string) => void
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError"
}

async function getResponseErrorMessage(response: Response) {
  const contentType = response.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    try {
      const payload = (await response.json()) as { message?: string | string[] }
      if (Array.isArray(payload.message)) {
        const normalized = payload.message.filter((item): item is string => typeof item === "string")
        if (normalized.length > 0) {
          return normalized.join(", ")
        }
      }
      if (typeof payload.message === "string" && payload.message.trim() !== "") {
        return payload.message
      }
    } catch {
      return "Falha na execucao"
    }
  }

  try {
    const text = await response.text()
    if (text.trim() !== "") {
      return text
    }
  } catch {
    return "Falha na execucao"
  }

  return "Falha na execucao"
}

export async function runExecutionStream(options: ExecutionStreamOptions) {
  const maxRetries = options.maxRetries ?? 2

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await options.fetchExecution(options.input, options.signal)
      if (!response.ok) {
        const message = await getResponseErrorMessage(response)
        options.onErrorMessage(message)
        if (response.status >= 400 && response.status < 500) {
          throw new Error("execute_error_non_retryable")
        }
        if (attempt < maxRetries) {
          continue
        }
        throw new Error("execute_error")
      }

      if (!response.body) {
        if (attempt < maxRetries) {
          continue
        }
        options.onErrorMessage("Falha na execucao")
        throw new Error("execute_error")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          return
        }

        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split("\n\n")
        buffer = events.pop() ?? ""

        for (const block of events) {
          const eventMatch = block.match(/^event:\s*(.+)$/m)
          const dataMatch = block.match(/^data:\s*(.+)$/m)
          if (!eventMatch || !dataMatch) {
            continue
          }

          const eventName = eventMatch[1]
          const dataRaw = dataMatch[1]

          if (eventName === "chunk") {
            try {
              const payload = JSON.parse(dataRaw) as { content?: string }
              if (payload.content) {
                options.onChunk(payload.content)
              }
            } catch {
              continue
            }
          }

          if (eventName === "error") {
            try {
              const payload = JSON.parse(dataRaw) as { message?: string }
              options.onErrorMessage(payload.message ?? "Falha na execucao")
            } catch {
              options.onErrorMessage("Falha na execucao")
            }
            throw new Error("execute_error")
          }
        }
      }
    } catch (error) {
      if (isAbortError(error)) {
        throw error
      }
      if (error instanceof Error && error.message === "execute_error_non_retryable") {
        throw error
      }
      if (attempt >= maxRetries) {
        throw error
      }
    }
  }
}
