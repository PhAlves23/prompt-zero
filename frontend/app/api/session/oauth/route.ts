import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/constants"

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("accessToken" in body) ||
    !("refreshToken" in body)
  ) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 })
  }

  const { accessToken, refreshToken } = body as {
    accessToken: unknown
    refreshToken: unknown
  }

  if (
    typeof accessToken !== "string" ||
    typeof refreshToken !== "string" ||
    accessToken.length < 10 ||
    refreshToken.length < 10
  ) {
    return NextResponse.json({ error: "invalid_tokens" }, { status: 400 })
  }

  const cookieStore = await cookies()
  cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60,
  })
  cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  })

  return NextResponse.json({ ok: true })
}
