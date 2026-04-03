/**
 * Client IP as seen by the Next.js BFF (Vercel, nginx, Cloudflare, etc.).
 */
export function getClientIpFromProxyHeaders(request: Request): string | undefined {
  const cf = request.headers.get("cf-connecting-ip")?.trim()
  if (cf) return cf
  const realIp = request.headers.get("x-real-ip")?.trim()
  if (realIp) return realIp
  const fly = request.headers.get("fly-client-ip")?.trim()
  if (fly) return fly
  const xff = request.headers.get("x-forwarded-for")
  if (xff) {
    const first = xff.split(",")[0]?.trim()
    if (first) return first
  }
  return undefined
}

/**
 * Headers to send to the Nest API so audit and logs can record the real client.
 */
export function clientIpHeadersForBackendProxy(request: Request): Record<string, string> {
  const out: Record<string, string> = {}
  const existingXff = request.headers.get("x-forwarded-for")?.trim()
  const derived = getClientIpFromProxyHeaders(request)

  if (existingXff) {
    out["x-forwarded-for"] = existingXff
  } else if (derived) {
    out["x-forwarded-for"] = derived
  }

  const xr = request.headers.get("x-real-ip")?.trim()
  if (xr) out["x-real-ip"] = xr
  const cf = request.headers.get("cf-connecting-ip")?.trim()
  if (cf) out["cf-connecting-ip"] = cf

  return out
}
