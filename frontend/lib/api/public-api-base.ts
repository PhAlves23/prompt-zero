/**
 * Base URL for browser redirects to the Nest API (must include `/api/v1` or your versioned prefix).
 * Set in `.env.local`: NEXT_PUBLIC_BACKEND_API_URL=http://localhost:3001/api/v1
 */
export function getPublicBackendApiBase(): string {
  return (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "http://localhost:3001/api/v1").replace(/\/+$/, "")
}
