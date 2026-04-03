"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import type { Dictionary } from "@/app/[lang]/dictionaries"

export function OAuthCallbackClient({ lang, dict }: { lang: string; dict: Dictionary }) {
  const router = useRouter()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) {
      return
    }
    ran.current = true

    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash
    const params = new URLSearchParams(hash)
    const access = params.get("access_token")
    const refresh = params.get("refresh_token")

    if (!access || !refresh) {
      toast.error(dict.auth.oauthCallback.missingTokens)
      router.replace(`/${lang}/auth/login`)
      return
    }

    void (async () => {
      const res = await fetch("/api/session/oauth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accessToken: access, refreshToken: refresh }),
      })

      window.history.replaceState(null, "", window.location.pathname + window.location.search)

      if (!res.ok) {
        toast.error(dict.auth.oauthCallback.failed)
        router.replace(`/${lang}/auth/login`)
        return
      }

      toast.success(dict.auth.oauthCallback.success)
      router.replace(`/${lang}/dashboard`)
      router.refresh()
    })()
  }, [dict.auth.oauthCallback, lang, router])

  return (
    <p className="text-center text-sm text-muted-foreground">{dict.auth.oauthCallback.working}</p>
  )
}
