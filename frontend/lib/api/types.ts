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
  fromCache?: boolean
  cacheKey?: string | null
}

export type PlaygroundCompareMeta = {
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  latencyMs: number
  estimatedCost: number
  pricingSource: string
}

export type PlaygroundCompareResultItem =
  | {
      model: string
      provider?: string
      ok: true
      output: string
      meta: PlaygroundCompareMeta
      executionId: string
    }
  | {
      model: string
      provider?: string
      ok: false
      error: string
    }

export type PlaygroundCompareResponse = {
  results: PlaygroundCompareResultItem[]
}

export type PlaygroundProviderOption = "openai" | "anthropic" | "google" | "openrouter"

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

export type WorkspaceCacheConfig = {
  workspaceId: string
  cacheEnabled: boolean
  cacheTtlSeconds: number
}

export type CacheStats = {
  period: "7d" | "30d" | "90d"
  total: number
  hits: number
  misses: number
  hitRate: number
  savedCost: number
  savedTokens: number
}

export type CacheStatsPerDay = {
  day: string
  total: number
  hits: number
  misses: number
  hitRate: number
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

export type BillingUsage = {
  tier: string
  status: string
  usageLimitExecutions: number
  executionsThisPeriod: number
  periodStart: string
  periodEnd: string
  stripeCustomerId: string | null
  hasActivePaid: boolean
}

export type DatasetListItem = {
  id: string
  name: string
  description: string | null
  rowCount: number
  createdAt: string
  updatedAt: string
  _count: { rows: number; runs: number }
}

export type DatasetDetail = DatasetListItem & {
  rows: Array<{
    id: string
    rowIndex: number
    variables: Record<string, unknown>
    expectedOutput?: string | null
  }>
}

export type DatasetRunSummary = {
  id: string
  datasetId: string
  promptId: string
  status: string
  completedAt: string | null
  results: unknown
  createdAt: string
}

export type DatasetRunListItem = DatasetRunSummary & {
  prompt: { id: string; title: string }
}

export type DatasetRunExecutionRow = {
  id: string
  output: string | null
  latencyMs: number | null
  totalTokens: number | null
  estimatedCost: number | null
  createdAt: string
}

export type DatasetRunDetail = DatasetRunListItem & {
  executions: DatasetRunExecutionRow[]
}

export type TraceRunListItem = {
  id: string
  userId: string
  name: string | null
  source: string
  createdAt: string
  _count: { spans: number }
}

export type TraceSpan = {
  id: string
  traceRunId: string
  parentId: string | null
  name: string
  startTime: string
  endTime: string | null
  attributes: Record<string, unknown> | null
}

export type TraceRunDetail = TraceRunListItem & {
  spans: TraceSpan[]
}

export type AuditLogEntry = {
  id: string
  userId: string | null
  action: string
  resource: string
  metadata: unknown
  ipAddress: string | null
  userAgent: string | null
  timestamp: string
}

export type WebhookItem = {
  id: string
  name: string | null
  url: string
  events: string[]
  isActive: boolean
  filters?: Record<string, unknown> | null
  retryCount: number
  timeoutMs: number
  lastTriggeredAt: string | null
  failureCount: number
  createdAt: string
  updatedAt?: string
}

export type WebhookDeliveryItem = {
  id: string
  webhookId: string
  event: string
  payload: unknown
  statusCode: number | null
  responseBody: string | null
  requestHeaders?: unknown
  errorMessage?: string | null
  attempts: number
  deliveredAt: string | null
  createdAt: string
}

export type PlatformApiKeyMeta = {
  id: string
  label: string | null
  keyPrefix: string
  createdAt: string
  lastUsedAt: string | null
}

export type EvaluationCriteria = {
  id: string
  userId: string
  name: string
  description: string | null
  prompt: string
  scoreMin: number
  scoreMax: number
}

export type ExecutionEvaluation = {
  id: string
  executionId: string
  criteriaId: string
  score: number
  reasoning: string | null
  judgeModel: string
  createdAt: string
}

export type PromptComment = {
  id: string
  promptId: string
  userId: string
  content: string
  parentId: string | null
  createdAt: string
  updatedAt: string
  user: { id: string; name: string; email: string }
  replies: PromptComment[]
  mentions: Array<{ id: string; userId: string; user: { id: string; email: string } }>
}

export type WorkspaceMemberRow = {
  id: string
  role: string
  invitedAt: string
  user: { id: string; name: string; email: string }
}

export type WorkspaceMembersResponse = {
  owner: { id: string; name: string; email: string } | null
  members: WorkspaceMemberRow[]
}
