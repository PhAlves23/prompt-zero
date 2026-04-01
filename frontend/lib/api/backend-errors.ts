/** Backend i18n keys returned in JSON/SSE when translation is missing or bypassed */
export const PROVIDER_API_KEY_NOT_CONFIGURED = "errors.providerApiKeyNotConfigured"

export function isProviderApiKeyNotConfiguredError(message: unknown): boolean {
  if (message === PROVIDER_API_KEY_NOT_CONFIGURED) {
    return true
  }
  if (Array.isArray(message)) {
    return message.some((item) => typeof item === "string" && item === PROVIDER_API_KEY_NOT_CONFIGURED)
  }
  return false
}
