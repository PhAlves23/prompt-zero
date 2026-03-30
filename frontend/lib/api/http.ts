import "server-only"

import { cookies } from "next/headers"
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/constants"
import type { ApiErrorPayload } from "@/lib/api/types"

const DEFAULT_BACKEND_URL = "http://localhost:3001/api/v1"

export function getBackendBaseUrl() {
  const configuredUrl = process.env.BACKEND_API_URL ?? DEFAULT_BACKEND_URL
  return configuredUrl.replace(/\/+$/, "")
}

export class HttpError extends Error {
  readonly payload: ApiErrorPayload
  readonly status: number

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.message)
    this.name = "HttpError"
    this.status = status
    this.payload = payload
  }
}

type ServerFetchOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  body?: unknown
  query?: URLSearchParams
  accessToken?: string
  revalidateSeconds?: number
}

function normalizeError(path: string, status: number, payload: unknown): ApiErrorPayload {
  if (
    payload &&
    typeof payload === "object" &&
    "code" in payload &&
    "message" in payload &&
    "path" in payload &&
    "requestId" in payload &&
    "timestamp" in payload
  ) {
    return payload as ApiErrorPayload
  }

  return {
    code: `http_${status}`,
    message: "Unexpected error",
    path,
    requestId: "unknown",
    timestamp: new Date().toISOString(),
  }
}

export async function serverFetch<T>(path: string, options?: ServerFetchOptions): Promise<T> {
  const method = options?.method ?? "GET"
  const baseUrl = getBackendBaseUrl()
  const search = options?.query ? `?${options.query.toString()}` : ""
  const url = `${baseUrl}${path}${search}`
  const cookieStore = await cookies()
  const token = options?.accessToken ?? cookieStore.get(ACCESS_TOKEN_COOKIE)?.value

  const response = await fetch(url, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
    cache: options?.revalidateSeconds ? "force-cache" : "no-store",
    next: options?.revalidateSeconds ? { revalidate: options.revalidateSeconds } : undefined,
  })

  if (!response.ok) {
    let payload: unknown = null
    try {
      payload = await response.json()
    } catch {
      payload = null
    }
    throw new HttpError(response.status, normalizeError(path, response.status, payload))
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export async function serverFetchRaw(path: string, options?: ServerFetchOptions) {
  const method = options?.method ?? "GET"
  const baseUrl = getBackendBaseUrl()
  const search = options?.query ? `?${options.query.toString()}` : ""
  const url = `${baseUrl}${path}${search}`
  const cookieStore = await cookies()
  const token = options?.accessToken ?? cookieStore.get(ACCESS_TOKEN_COOKIE)?.value

  return fetch(url, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  })
}
