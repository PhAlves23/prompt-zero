import { describe, expect, it, vi } from "vitest"
import {
  createProviderCredential,
  deleteProviderCredential,
  toCreateProviderCredentialBody,
  toUpdateProviderCredentialBody,
  updateProviderCredential,
} from "../lib/features/settings/provider-credentials"

describe("provider credentials helpers", () => {
  it("builds create payload with optional baseUrl normalization", () => {
    const payload = toCreateProviderCredentialBody({
      provider: "openai",
      label: "Main",
      apiKey: "secret-key",
      baseUrl: "",
    })

    expect(payload).toEqual({
      provider: "openai",
      label: "Main",
      apiKey: "secret-key",
      baseUrl: undefined,
    })
  })

  it("builds update payload without provider", () => {
    const payload = toUpdateProviderCredentialBody({
      provider: "anthropic",
      label: "Backup",
      apiKey: "new-key",
      baseUrl: "https://api.example.com",
    })

    expect(payload).toEqual({
      label: "Backup",
      apiKey: "new-key",
      baseUrl: "https://api.example.com",
    })
  })

  it("normalizes empty baseUrl on update payload", () => {
    const payload = toUpdateProviderCredentialBody({
      provider: "openai",
      label: "Main",
      apiKey: "rotated-key",
      baseUrl: "",
    })

    expect(payload).toEqual({
      label: "Main",
      apiKey: "rotated-key",
      baseUrl: undefined,
    })
  })

  it("executes create request with expected path and method", async () => {
    const client = vi.fn().mockResolvedValue({
      id: "credential-id",
      provider: "openai",
      label: "Main",
      hasApiKey: true,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    })

    await createProviderCredential(client, {
      provider: "openai",
      label: "Main",
      apiKey: "secret-key",
      baseUrl: "",
    })

    expect(client).toHaveBeenCalledWith("/users/provider-credentials", {
      method: "POST",
      body: {
        provider: "openai",
        label: "Main",
        apiKey: "secret-key",
        baseUrl: undefined,
      },
    })
  })

  it("executes update and delete requests with expected endpoints", async () => {
    const client = vi.fn().mockResolvedValue(undefined)

    await updateProviderCredential(client, "credential-id", {
      provider: "openai",
      label: "Renamed",
      apiKey: "updated-key",
      baseUrl: "https://api.example.com",
    })
    await deleteProviderCredential(client, "credential-id")

    expect(client).toHaveBeenNthCalledWith(1, "/users/provider-credentials/credential-id", {
      method: "PATCH",
      body: {
        label: "Renamed",
        apiKey: "updated-key",
        baseUrl: "https://api.example.com",
      },
    })
    expect(client).toHaveBeenNthCalledWith(2, "/users/provider-credentials/credential-id", {
      method: "DELETE",
    })
  })
})
