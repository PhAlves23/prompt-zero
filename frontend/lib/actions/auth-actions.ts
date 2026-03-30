"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { apiServices } from "@/lib/api/services"
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/constants"

export async function refreshSessionAction() {
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value
  if (!refreshToken) {
    return { ok: false as const }
  }

  const tokens = await apiServices.auth.refresh({ refreshToken })
  cookieStore.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60,
  })
  cookieStore.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  })
  revalidatePath("/")
  return { ok: true as const }
}
