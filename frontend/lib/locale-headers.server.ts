import "server-only"

import { headers } from "next/headers"
import { buildBackendLocaleHeadersFromLocale, normalizeAppLocale } from "@/lib/locale-i18n"
import { defaultLocale } from "@/lib/locales"

/**
 * Headers to send to the API so validation/error messages match the UI language.
 * Uses `x-lang` (HeaderResolver) and `accept-language` (AcceptLanguageResolver).
 */
export async function getLocaleHeadersForBackend(): Promise<Record<string, string>> {
  try {
    const h = await headers()
    const xLang = h.get("x-lang")
    if (xLang) {
      const loc = normalizeAppLocale(xLang)
      return buildBackendLocaleHeadersFromLocale(loc)
    }
    const accept = h.get("accept-language")
    if (accept) {
      return { "accept-language": accept }
    }
  } catch {
    /* headers() unavailable outside a request */
  }
  return buildBackendLocaleHeadersFromLocale(defaultLocale)
}
