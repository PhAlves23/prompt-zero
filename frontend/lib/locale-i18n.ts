import { defaultLocale, isLocale, type Locale } from "@/lib/locales"

/** RFC-style Accept-Language for the backend (nestjs-i18n + AcceptLanguageResolver). */
export function buildAcceptLanguageHeader(locale: string): string {
  const trimmed = locale.trim()
  const base = trimmed.split("-")[0] ?? "pt"
  return `${trimmed}, ${base};q=0.9`
}

/** Maps app locale (pt-BR, en-US, es-ES) to backend `x-lang` (same value; backend uses fallbacks). */
export function normalizeAppLocale(value: string | null | undefined): Locale {
  if (value && isLocale(value.trim())) {
    return value.trim() as Locale
  }
  return defaultLocale
}

/** Extract locale from app routes like `/pt-BR/dashboard`. */
export function getLocaleFromAppPathname(pathname: string): Locale {
  const m = pathname.match(/^\/([a-z]{2}-[A-Z]{2})(?:\/|$)/)
  if (m?.[1] && isLocale(m[1])) {
    return m[1] as Locale
  }
  return defaultLocale
}

export function buildBackendLocaleHeadersFromLocale(loc: Locale): Record<string, string> {
  return {
    "x-lang": loc,
    "accept-language": buildAcceptLanguageHeader(loc),
  }
}
