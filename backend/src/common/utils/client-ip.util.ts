import type { Request } from 'express';

const DEFAULT_TRUSTED_PROXY_PEERS = new Set([
  '127.0.0.1',
  '::1',
  '::ffff:127.0.0.1',
]);

function trustedProxyPeers(): Set<string> {
  const extra =
    process.env.TRUSTED_PROXY_PEERS?.split(',').map((s) => s.trim()) ?? [];
  return new Set([...DEFAULT_TRUSTED_PROXY_PEERS, ...extra.filter(Boolean)]);
}

/**
 * Client IP for logging/audit. Uses X-Forwarded-For only when the TCP peer is a
 * trusted proxy (e.g. Next BFF on loopback or an internal container IP).
 */
export function getClientIp(req: Request): string | null {
  const peer = req.socket?.remoteAddress ?? '';
  const xffRaw = req.headers['x-forwarded-for'];
  const xffStr = Array.isArray(xffRaw) ? xffRaw[0] : xffRaw;

  if (typeof xffStr === 'string' && trustedProxyPeers().has(peer)) {
    const first = xffStr.split(',')[0]?.trim();
    if (first) {
      return first.slice(0, 120);
    }
  }

  const fallback = req.ip || peer;
  return fallback ? String(fallback).slice(0, 120) : null;
}
