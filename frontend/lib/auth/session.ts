import "server-only"

import { cookies } from "next/headers"
import { apiServices } from "@/lib/api/services"
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/constants"
import type { UserProfile } from "@/lib/api/types"

export async function getSessionUser(): Promise<UserProfile | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value
  if (!token) {
    return null
  }

  try {
    return await apiServices.auth.me()
  } catch {
    return null
  }
}
