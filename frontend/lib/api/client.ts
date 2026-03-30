import type { ApiErrorPayload } from "@/lib/api/types"

export class ClientHttpError extends Error {
  readonly payload: ApiErrorPayload
  readonly status: number

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.message)
    this.name = "ClientHttpError"
    this.status = status
    this.payload = payload
  }
}

type ClientFetchOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  body?: unknown
}

export async function bffFetch<T>(path: string, options?: ClientFetchOptions): Promise<T> {
  const method = options?.method ?? "GET"
  const response = await fetch(`/api/bff${path}`, {
    method,
    credentials: "include",
    headers: {
      "content-type": "application/json",
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  })

  if (!response.ok) {
    const payload = (await response.json()) as ApiErrorPayload
    throw new ClientHttpError(response.status, payload)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
