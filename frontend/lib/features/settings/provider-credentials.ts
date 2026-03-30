import type { ProviderCredential } from "../../api/types"

export type ProviderCredentialFormValues = {
  provider: string
  label?: string
  apiKey: string
  baseUrl?: string
}

type BffFetch = <T>(
  path: string,
  options?: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
    body?: unknown
  },
) => Promise<T>

export function toCreateProviderCredentialBody(values: ProviderCredentialFormValues) {
  return {
    provider: values.provider,
    label: values.label,
    apiKey: values.apiKey,
    baseUrl: values.baseUrl || undefined,
  }
}

export function toUpdateProviderCredentialBody(values: ProviderCredentialFormValues) {
  return {
    label: values.label,
    apiKey: values.apiKey,
    baseUrl: values.baseUrl || undefined,
  }
}

export async function createProviderCredential(
  client: BffFetch,
  values: ProviderCredentialFormValues,
) {
  return client<ProviderCredential>("/users/provider-credentials", {
    method: "POST",
    body: toCreateProviderCredentialBody(values),
  })
}

export async function updateProviderCredential(
  client: BffFetch,
  id: string,
  values: ProviderCredentialFormValues,
) {
  return client<ProviderCredential>(`/users/provider-credentials/${id}`, {
    method: "PATCH",
    body: toUpdateProviderCredentialBody(values),
  })
}

export async function deleteProviderCredential(client: BffFetch, id: string) {
  return client<void>(`/users/provider-credentials/${id}`, {
    method: "DELETE",
  })
}
