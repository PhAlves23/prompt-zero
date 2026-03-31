import "server-only"

import { serverFetch } from "@/lib/api/http"
import type {
  AnalyticsCostPerModel,
  AnalyticsAbHistory,
  AnalyticsAbRanking,
  AnalyticsExecutionsPerDay,
  AnalyticsOverview,
  AnalyticsTopPrompt,
  ApiKeyStatus,
  AuthTokens,
  Experiment,
  ExperimentListItem,
  ExperimentResults,
  ExperimentRunResult,
  Execution,
  ExplorePrompt,
  PaginatedResult,
  Prompt,
  PromptVariable,
  PromptVersion,
  ProviderCredential,
  Tag,
  UserProfile,
  Workspace,
} from "@/lib/api/types"

export const apiServices = {
  auth: {
    register: (body: { name: string; email: string; password: string }) =>
      serverFetch<AuthTokens>("/auth/register", { method: "POST", body }),
    login: (body: { email: string; password: string }) =>
      serverFetch<AuthTokens>("/auth/login", { method: "POST", body }),
    refresh: (body: { refreshToken: string }) =>
      serverFetch<AuthTokens>("/auth/refresh", { method: "POST", body }),
    me: () => serverFetch<UserProfile>("/auth/me"),
  },
  prompts: {
    list: (query?: URLSearchParams) => serverFetch<PaginatedResult<Prompt>>("/prompts", { query }),
    get: (id: string) => serverFetch<Prompt>(`/prompts/${id}`),
    create: (body: {
      title: string
      description?: string
      content: string
      isPublic?: boolean
      workspaceId?: string
      tagIds?: string[]
    }) => serverFetch<Prompt>("/prompts", { method: "POST", body }),
    update: (
      id: string,
      body: Partial<{
        title: string
        description: string
        content: string
        isPublic: boolean
        isFavorite: boolean
        workspaceId: string
        tagIds: string[]
      }>,
    ) => serverFetch<Prompt>(`/prompts/${id}`, { method: "PATCH", body }),
    remove: (id: string) => serverFetch<void>(`/prompts/${id}`, { method: "DELETE" }),
    versions: (id: string) => serverFetch<PromptVersion[]>(`/prompts/${id}/versions`),
    versionById: (id: string, versionId: string) =>
      serverFetch<PromptVersion>(`/prompts/${id}/versions/${versionId}`),
    restoreVersion: (id: string, versionId: string) =>
      serverFetch<Prompt>(`/prompts/${id}/versions/${versionId}/restore`, { method: "POST" }),
    variables: (id: string) => serverFetch<PromptVariable[]>(`/prompts/${id}/variables`),
    syncVariables: (id: string, body: { variables: PromptVariable[] }) =>
      serverFetch<PromptVariable[]>(`/prompts/${id}/variables`, { method: "PUT", body }),
    fork: (id: string) => serverFetch<Prompt>(`/prompts/${id}/fork`, { method: "POST" }),
    execute: (id: string, body: { input: string; model: string; provider?: string }) =>
      serverFetch<Execution>(`/prompts/${id}/execute`, { method: "POST", body }),
    executions: (id: string, query?: URLSearchParams) =>
      serverFetch<PaginatedResult<Execution>>(`/prompts/${id}/executions`, { query }),
  },
  tags: {
    list: () => serverFetch<Tag[]>("/tags"),
    create: (body: { name: string; color?: string }) =>
      serverFetch<Tag>("/tags", { method: "POST", body }),
    update: (id: string, body: Partial<{ name: string; color: string }>) =>
      serverFetch<Tag>(`/tags/${id}`, { method: "PATCH", body }),
    remove: (id: string) => serverFetch<void>(`/tags/${id}`, { method: "DELETE" }),
  },
  workspaces: {
    list: () => serverFetch<Workspace[]>("/workspaces"),
    create: (body: { name: string; description?: string }) =>
      serverFetch<Workspace>("/workspaces", { method: "POST", body }),
    update: (id: string, body: Partial<{ name: string; description: string }>) =>
      serverFetch<Workspace>(`/workspaces/${id}`, { method: "PATCH", body }),
    remove: (id: string) => serverFetch<void>(`/workspaces/${id}`, { method: "DELETE" }),
  },
  settings: {
    updateProfile: (body: { name: string }) =>
      serverFetch<UserProfile>("/users/profile", { method: "PATCH", body }),
    getApiKeys: () => serverFetch<ApiKeyStatus>("/users/api-keys"),
    updateApiKeys: (body: {
      openaiApiKey?: string
      anthropicApiKey?: string
      googleApiKey?: string
      openrouterApiKey?: string
    }) => serverFetch<void>("/users/api-keys", { method: "PUT", body }),
    listProviderCredentials: () =>
      serverFetch<ProviderCredential[]>("/users/provider-credentials"),
    createProviderCredential: (body: {
      provider: string
      apiKey: string
      label?: string
      baseUrl?: string
    }) => serverFetch<ProviderCredential>("/users/provider-credentials", { method: "POST", body }),
    updateProviderCredential: (
      id: string,
      body: Partial<{ apiKey: string; label: string; baseUrl: string }>,
    ) =>
      serverFetch<ProviderCredential>(`/users/provider-credentials/${id}`, {
        method: "PATCH",
        body,
      }),
    removeProviderCredential: (id: string) =>
      serverFetch<void>(`/users/provider-credentials/${id}`, { method: "DELETE" }),
  },
  analytics: {
    overview: (period: "7d" | "30d" | "90d") =>
      serverFetch<AnalyticsOverview>("/analytics/overview", {
        query: new URLSearchParams({ period }),
      }),
    executionsPerDay: (period: "7d" | "30d" | "90d") =>
      serverFetch<AnalyticsExecutionsPerDay[]>("/analytics/executions-per-day", {
        query: new URLSearchParams({ period }),
      }),
    costPerModel: (period: "7d" | "30d" | "90d") =>
      serverFetch<AnalyticsCostPerModel[]>("/analytics/cost-per-model", {
        query: new URLSearchParams({ period }),
      }),
    topPrompts: (period: "7d" | "30d" | "90d", limit = 5) =>
      serverFetch<AnalyticsTopPrompt[]>("/analytics/top-prompts", {
        query: new URLSearchParams({ period, limit: String(limit) }),
      }),
    abHistory: (period: "7d" | "30d" | "90d") =>
      serverFetch<AnalyticsAbHistory[]>("/analytics/ab-history", {
        query: new URLSearchParams({ period }),
      }),
    abRanking: (period: "7d" | "30d" | "90d", limit = 5) =>
      serverFetch<AnalyticsAbRanking[]>("/analytics/ab-ranking", {
        query: new URLSearchParams({ period, limit: String(limit) }),
      }),
  },
  explore: {
    list: (query?: URLSearchParams) => serverFetch<PaginatedResult<ExplorePrompt>>("/explore", { query }),
    get: (id: string) => serverFetch<ExplorePrompt>(`/explore/${id}`),
  },
  experiments: {
    list: () => serverFetch<ExperimentListItem[]>("/experiments"),
    create: (body: {
      promptAId: string
      promptBId: string
      sampleSizeTarget?: number
      trafficSplitA?: number
    }) =>
      serverFetch<Experiment>("/experiments", { method: "POST", body }),
    run: (
      id: string,
      body: {
        model?: string
        provider?: string
        credentialId?: string
        temperature?: number
        topP?: number
        topK?: number
        maxTokens?: number
        variables?: Record<string, string>
      },
    ) => serverFetch<ExperimentRunResult>(`/experiments/${id}/run`, { method: "POST", body }),
    vote: (id: string, body: { exposureId: string; winnerVariant: "A" | "B" }) =>
      serverFetch<ExperimentResults>(`/experiments/${id}/vote`, { method: "POST", body }),
    results: (id: string) => serverFetch<ExperimentResults>(`/experiments/${id}/results`),
    stop: (id: string) => serverFetch<ExperimentResults>(`/experiments/${id}/stop`, { method: "POST" }),
  },
}
