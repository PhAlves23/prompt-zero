import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/constants"
import { getBackendBaseUrl } from "@/lib/api/http"
import {
  buildBackendLocaleHeadersFromLocale,
  getLocaleFromAppPathname,
  normalizeAppLocale,
} from "@/lib/locale-i18n"
import { defaultLocale, type Locale } from "@/lib/locales"
import { clientIpHeadersForBackendProxy } from "@/lib/api/proxy-client-ip"

const allowedMethods = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"])

function resolveLocaleForProxy(request: Request): Locale {
  const xLang = request.headers.get("x-lang")
  if (xLang) {
    return normalizeAppLocale(xLang)
  }
  const referer = request.headers.get("referer")
  if (referer) {
    try {
      return getLocaleFromAppPathname(new URL(referer).pathname)
    } catch {
      /* ignore invalid referer */
    }
  }
  return defaultLocale
}

async function proxy(request: Request, params: Promise<{ path: string[] }>) {
  const { path } = await params
  if (!allowedMethods.has(request.method)) {
    return NextResponse.json({ message: "Method not allowed" }, { status: 405 })
  }

  const baseUrl = getBackendBaseUrl()
  const incomingUrl = new URL(request.url)
  const query = incomingUrl.search
  const target = `${baseUrl}/${path.join("/")}${query}`

  const cookieStore = await cookies()
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value
  const canHaveBody = request.method !== "GET"
  const body = canHaveBody ? await request.text() : undefined

  const locale = resolveLocaleForProxy(request)
  const localeHeaders = buildBackendLocaleHeadersFromLocale(locale)

  const forwardIp = clientIpHeadersForBackendProxy(request)

  const response = await fetch(target, {
    method: request.method,
    headers: {
      "content-type": "application/json",
      ...localeHeaders,
      ...forwardIp,
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
    },
    body,
    cache: "no-store",
  })

  const headers = new Headers()
  const contentType = response.headers.get("content-type")
  if (contentType) {
    headers.set("content-type", contentType)
  }

  return new Response(response.body, {
    status: response.status,
    headers,
  })
}

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context.params)
}

export async function POST(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context.params)
}

export async function PUT(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context.params)
}

export async function PATCH(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context.params)
}

export async function DELETE(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context.params)
}
