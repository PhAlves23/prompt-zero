export type ApiErrorPayload = {
  code: string
  message: string
  path: string
  requestId: string
  timestamp: string
}

export type ApiResult<T> = {
  data: T
}

export type PaginatedMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
}

export type PaginatedResult<T> = {
  data: T[]
  meta: PaginatedMeta
}

export type AuthTokens = {
  accessToken: string
  refreshToken: string
}

export type UserProfile = {
  id: string
  name: string
  email: string
  avatarUrl?: string | null
  createdAt: string
  updatedAt: string
}

export type Prompt = {
  id: string
  title: string
  description: string | null
  content: string
  model: string
  language: "pt" | "en" | "es"
  isPublic: boolean
  isFavorite: boolean
  isTemplate: boolean
  forkCount: number
  createdAt: string
  updatedAt: string
  workspaceId: string | null
  tags?: Tag[]
}

export type PromptVersion = {
  id: string
  version: number
  content: string
  createdAt: string
}

export type PromptVariable = {
  name: string
  type: string
  required: boolean
  defaultValue: string | null
  description: string | null
}

export type Execution = {
  id: string
  promptId: string
  input: string
  output: string | null
  model: string
  provider: string
  latencyMs: number | null
  totalTokens: number | null
  estimatedCost: number | null
  createdAt: string
}

export type Tag = {
  id: string
  name: string
  color: string | null
  createdAt: string
  updatedAt: string
}

export type Workspace = {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export type ProviderCredential = {
  id: string
  provider: string
  label: string | null
  hasApiKey: boolean
  createdAt: string
  updatedAt: string
}

export type ApiKeyStatus = {
  openaiConfigured: boolean
  anthropicConfigured: boolean
  providers: ProviderCredential[]
}

export type AnalyticsOverview = {
  period: "7d" | "30d" | "90d"
  promptsTotal: number
  executionsTotal: number
  totalTokens: number
  totalEstimatedCost: number
}

export type AnalyticsExecutionsPerDay = {
  day: string
  total: number
}

export type AnalyticsCostPerModel = {
  model: string
  estimatedCost: number
  totalTokens: number
  avgLatencyMs: number
}

export type AnalyticsTopPrompt = {
  promptId: string
  promptTitle: string
  executions: number
}

export type AnalyticsAbHistory = {
  day: string
  votes: number
  experiments: number
}

export type AnalyticsAbRanking = {
  experimentId: string
  status: "running" | "stopped"
  promptATitle: string
  promptBTitle: string
  votesA: number
  votesB: number
  totalVotes: number
  winnerVariant: "A" | "B"
  winnerPercent: number
}

export type ExplorePrompt = Prompt

export type SessionUser = {
  name: string
  email: string
}

export type Experiment = {
  id: string
  userId: string
  promptAId: string
  promptBId: string
  trafficSplitA: number
  status: "running" | "stopped"
  sampleSizeTarget: number | null
  startedAt: string
  endedAt: string | null
  createdAt: string
  updatedAt: string
}

export type ExperimentRunResult = {
  experimentId: string
  promptId: string
  variant: "A" | "B"
  exposureId: string
  output: string
  meta: {
    model: string
    inputTokens: number
    outputTokens: number
    totalTokens: number
    latencyMs: number
    estimatedCost: number
    pricingSource: "dynamic" | "fallback"
  }
}

export type ExperimentResults = {
  experimentId: string
  status: "running" | "stopped"
  trafficSplitA: number
  trafficSplitB: number
  startedAt: string
  endedAt: string | null
  votesA: number
  votesB: number
  totalVotes: number
  percentA: number
  percentB: number
}

export type ExperimentListItem = {
  id: string
  status: "running" | "stopped"
  promptAId: string
  promptBId: string
  promptATitle: string
  promptBTitle: string
  trafficSplitA: number
  trafficSplitB: number
  sampleSizeTarget: number | null
  startedAt: string
  endedAt: string | null
  createdAt: string
  votesA: number
  votesB: number
  totalVotes: number
  percentA: number
  percentB: number
}
