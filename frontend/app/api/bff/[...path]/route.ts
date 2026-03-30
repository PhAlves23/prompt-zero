import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/constants"
import { getBackendBaseUrl } from "@/lib/api/http"

const allowedMethods = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"])

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

  const response = await fetch(target, {
    method: request.method,
    headers: {
      "content-type": "application/json",
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
