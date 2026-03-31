export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  prompts: {
    list: (query: string) => ["prompts", "list", query] as const,
    detail: (id: string) => ["prompts", "detail", id] as const,
    versions: (id: string) => ["prompts", "versions", id] as const,
    variables: (id: string) => ["prompts", "variables", id] as const,
    executions: (id: string) => ["prompts", "executions", id] as const,
  },
  tags: {
    list: ["tags", "list"] as const,
  },
  workspaces: {
    list: ["workspaces", "list"] as const,
  },
  settings: {
    profile: ["settings", "profile"] as const,
    apiKeys: ["settings", "api-keys"] as const,
    providerCredentials: ["settings", "provider-credentials"] as const,
  },
  analytics: {
    overview: (period: string) => ["analytics", "overview", period] as const,
    executionsPerDay: (period: string) => ["analytics", "executions-per-day", period] as const,
    costPerModel: (period: string) => ["analytics", "cost-per-model", period] as const,
    topPrompts: (period: string, limit: number) =>
      ["analytics", "top-prompts", period, limit] as const,
    abHistory: (period: string) => ["analytics", "ab-history", period] as const,
    abRanking: (period: string, limit: number) =>
      ["analytics", "ab-ranking", period, limit] as const,
  },
  explore: {
    list: (query: string) => ["explore", "list", query] as const,
    detail: (id: string) => ["explore", "detail", id] as const,
  },
  experiments: {
    list: ["experiments", "list"] as const,
    results: (id: string) => ["experiments", "results", id] as const,
  },
}
