"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { parseAsString, useQueryState } from "nuqs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { bffFetch } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/query-keys"
import type {
  AnalyticsAbHistory,
  AnalyticsAbRanking,
  AnalyticsCostPerModel,
  AnalyticsExecutionsPerDay,
  AnalyticsOverview,
  AnalyticsTopPrompt,
  Tag,
  Workspace,
} from "@/lib/api/types"
import type { ExperimentsPageDictionary } from "@/components/pages/experiments-page-client"

const periods = ["7d", "30d", "90d"] as const

const executionsChartConfig = {
  total: {
    label: "Execucoes",
    color: "var(--primary)",
  },
} satisfies ChartConfig

const costChartConfig = {
  estimatedCost: {
    label: "Custo",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

const abHistoryChartConfig = {
  votes: {
    label: "Votos A/B",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig

export function DashboardPageClient({
  lang,
  experiments: experimentsI18n,
}: {
  lang: string
  experiments: ExperimentsPageDictionary
}) {
  const [period, setPeriod] = useQueryState("period", parseAsString.withDefault("30d"))
  const isPt = lang.startsWith("pt")
  const isEs = lang.startsWith("es")
  const t = {
    loadingSeries: isEs ? "Cargando serie temporal..." : isPt ? "Carregando série temporal..." : "Loading time series...",
    loadExecPerDayError:
      isEs ? "Error al cargar ejecuciones por día." : isPt ? "Falha ao carregar execuções por dia." : "Failed to load executions per day.",
    loadingRanking: isEs ? "Cargando ranking..." : isPt ? "Carregando ranking..." : "Loading ranking...",
    loadRankingError:
      isEs ? "Error al cargar ranking de prompts." : isPt ? "Falha ao carregar ranking de prompts." : "Failed to load prompts ranking.",
    loadingCost: isEs ? "Cargando distribución de costos..." : isPt ? "Carregando distribuição de custos..." : "Loading cost distribution...",
    loadCostError:
      isEs ? "Error al cargar costo por modelo." : isPt ? "Falha ao carregar custo por modelo." : "Failed to load model costs.",
    noModelUsage: isEs ? "No se registró consumo de modelo." : isPt ? "Nenhum consumo de modelo foi registrado ainda." : "No model usage registered yet.",
    loadingAbHistory: isEs ? "Cargando histórico A/B..." : isPt ? "Carregando histórico A/B..." : "Loading A/B history...",
    loadAbHistoryError: isEs ? "Error al cargar histórico A/B." : isPt ? "Falha ao carregar histórico A/B." : "Failed to load A/B history.",
    loadingAbRanking: isEs ? "Cargando ranking A/B..." : isPt ? "Carregando ranking A/B..." : "Loading A/B ranking...",
    loadAbRankingError: isEs ? "Error al cargar ranking A/B." : isPt ? "Falha ao carregar ranking A/B." : "Failed to load A/B ranking.",
    loadingGeneric: isEs ? "Cargando..." : isPt ? "Carregando..." : "Loading...",
    loadGenericError: isEs ? "Error al cargar." : isPt ? "Falha ao carregar." : "Failed to load.",
    prompts: isEs ? "Prompts" : "Prompts",
    activePrompts: isEs ? "Total de prompts activos" : isPt ? "Total de prompts ativos" : "Total active prompts",
    executions: isEs ? "Ejecuciones" : isPt ? "Execuções" : "Executions",
    executionsInPeriod: isEs ? "Ejecuciones en los últimos" : isPt ? "Execuções nos últimos" : "Executions in the last",
    tokens: "Tokens",
    tokenUsage: isEs ? "Consumo total en" : isPt ? "Consumo total em" : "Total usage in",
    estimatedCost: isEs ? "Costo estimado" : isPt ? "Custo estimado" : "Estimated cost",
    aggregatedCost: isEs ? "Costo agregado en" : isPt ? "Custo agregado em" : "Aggregated cost in",
    workspaces: isEs ? "Espacios de trabajo" : "Workspaces",
    workspaceDesc: isEs ? "Espacios de organización" : isPt ? "Espaços de organização" : "Organization spaces",
    tags: "Tags",
    tagsDesc: isEs ? "Etiquetas registradas" : isPt ? "Etiquetas cadastradas" : "Registered tags",
    executionsPerDay: isEs ? "Ejecuciones por día" : isPt ? "Execuções por dia" : "Executions per day",
    usageTrend: isEs ? "Tendencia de uso en el período seleccionado" : isPt ? "Tendência de uso no período selecionado" : "Usage trend in selected period",
    noExecutionsPeriod: isEs ? "Sin ejecuciones en el período" : isPt ? "Sem execuções no período" : "No executions in period",
    runPromptHint: isEs ? "Ejecuta un prompt para ver la curva de uso." : isPt ? "Rode um prompt para visualizar a curva de uso." : "Run a prompt to view usage curve.",
    topPrompts: isEs ? "Top prompts" : "Top prompts",
    mostExecuted: isEs ? "Más ejecutados en el período" : isPt ? "Mais executados no período" : "Most executed in period",
    shortExec: isEs ? "ejec." : isPt ? "exec." : "exec.",
    noRankingYet: isEs ? "Sin ranking todavía" : isPt ? "Sem ranking ainda" : "No ranking yet",
    rankingHint: isEs ? "Cuando haya ejecuciones, el ranking aparecerá aquí." : isPt ? "Quando houver execuções, o ranking aparece aqui." : "When there are executions, ranking appears here.",
    costByModel: isEs ? "Costo por modelo" : isPt ? "Custo por modelo" : "Cost by model",
    costDistribution: isEs ? "Distribución de costo entre modelos usados" : isPt ? "Distribuição de custo entre modelos usados" : "Cost distribution across used models",
    noCostPeriod: isEs ? "Sin costo en el período" : isPt ? "Sem custo no período" : "No cost in period",
    noCostHint: isEs ? "Aún no se registró consumo de modelos." : isPt ? "Nenhum consumo de modelo foi registrado ainda." : "No model usage registered yet.",
    abHistory: isEs ? "Historial A/B por día" : isPt ? "Histórico A/B por dia" : "A/B history by day",
    abVolume: isEs ? "Volumen de votos de experimentos A/B en el período" : isPt ? "Volume de votos de experimentos A/B no período" : "A/B experiment votes volume in period",
    noAbHistory: isEs ? "Sin histórico A/B en el período" : isPt ? "Sem histórico A/B no período" : "No A/B history in period",
    noAbHistoryHint: isEs ? "Crea experimentos y registra votos para poblar este gráfico." : isPt ? "Crie experimentos e registre votos para popular este gráfico." : "Create experiments and register votes to populate this chart.",
    abRanking: isEs ? "Ranking de experimentos A/B" : isPt ? "Ranking de experimentos A/B" : "A/B experiment ranking",
    mostVotes: isEs ? "Experimentos con más votos en el período" : isPt ? "Experimentos com mais votos no período" : "Experiments with most votes in period",
    votes: isEs ? "votos" : "votos",
    winner: isEs ? "Ganador" : isPt ? "Vencedor" : "Winner",
    noAbRankingYet: isEs ? "Sin ranking A/B todavía" : isPt ? "Sem ranking A/B ainda" : "No A/B ranking yet",
    noAbRankingHint: isEs ? "Aún no hay votos de experimento en el período seleccionado." : isPt ? "Ainda não há votos de experimento no período selecionado." : "No experiment votes in selected period yet.",
  }
  const selectedPeriod = period === "7d" || period === "30d" || period === "90d" ? period : "30d"

  const overviewQuery = useQuery({
    queryKey: queryKeys.analytics.overview(selectedPeriod),
    queryFn: () => bffFetch<AnalyticsOverview>(`/analytics/overview?period=${selectedPeriod}`),
  })
  const executionsPerDayQuery = useQuery({
    queryKey: queryKeys.analytics.executionsPerDay(selectedPeriod),
    queryFn: () =>
      bffFetch<AnalyticsExecutionsPerDay[]>(`/analytics/executions-per-day?period=${selectedPeriod}`),
  })
  const costPerModelQuery = useQuery({
    queryKey: queryKeys.analytics.costPerModel(selectedPeriod),
    queryFn: () => bffFetch<AnalyticsCostPerModel[]>(`/analytics/cost-per-model?period=${selectedPeriod}`),
  })
  const topPromptsQuery = useQuery({
    queryKey: queryKeys.analytics.topPrompts(selectedPeriod, 5),
    queryFn: () => bffFetch<AnalyticsTopPrompt[]>(`/analytics/top-prompts?period=${selectedPeriod}&limit=5`),
  })
  const abHistoryQuery = useQuery({
    queryKey: queryKeys.analytics.abHistory(selectedPeriod),
    queryFn: () => bffFetch<AnalyticsAbHistory[]>(`/analytics/ab-history?period=${selectedPeriod}`),
  })
  const abRankingQuery = useQuery({
    queryKey: queryKeys.analytics.abRanking(selectedPeriod, 5),
    queryFn: () => bffFetch<AnalyticsAbRanking[]>(`/analytics/ab-ranking?period=${selectedPeriod}&limit=5`),
  })
  const workspacesQuery = useQuery({
    queryKey: queryKeys.workspaces.list,
    queryFn: () => bffFetch<Workspace[]>("/workspaces"),
  })
  const tagsQuery = useQuery({
    queryKey: queryKeys.tags.list,
    queryFn: () => bffFetch<Tag[]>("/tags"),
  })

  return (
    <div className="grid gap-4 px-4 lg:px-6">
      <div className="flex flex-wrap items-center gap-2">
        {periods.map((item) => (
          <Button
            key={item}
            variant={selectedPeriod === item ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setPeriod(item)}
          >
            {item}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          title={t.prompts}
          description={t.activePrompts}
          value={overviewQuery.data?.promptsTotal}
          isLoading={overviewQuery.isPending}
          isError={overviewQuery.isError}
          loadingLabel={t.loadingGeneric}
          errorLabel={t.loadGenericError}
        />
        <MetricCard
          title={t.executions}
          description={`${t.executionsInPeriod} ${selectedPeriod}`}
          value={overviewQuery.data?.executionsTotal}
          isLoading={overviewQuery.isPending}
          isError={overviewQuery.isError}
          loadingLabel={t.loadingGeneric}
          errorLabel={t.loadGenericError}
        />
        <MetricCard
          title={t.tokens}
          description={`${t.tokenUsage} ${selectedPeriod}`}
          value={overviewQuery.data?.totalTokens}
          isLoading={overviewQuery.isPending}
          isError={overviewQuery.isError}
          loadingLabel={t.loadingGeneric}
          errorLabel={t.loadGenericError}
        />
        <MetricCard
          title={t.estimatedCost}
          description={`${t.aggregatedCost} ${selectedPeriod}`}
          value={formatCurrency(overviewQuery.data?.totalEstimatedCost, lang)}
          isLoading={overviewQuery.isPending}
          isError={overviewQuery.isError}
          loadingLabel={t.loadingGeneric}
          errorLabel={t.loadGenericError}
        />
        <MetricCard
          title={t.workspaces}
          description={t.workspaceDesc}
          value={workspacesQuery.data?.length}
          isLoading={workspacesQuery.isPending}
          isError={workspacesQuery.isError}
          loadingLabel={t.loadingGeneric}
          errorLabel={t.loadGenericError}
        />
        <MetricCard
          title={t.tags}
          description={t.tagsDesc}
          value={tagsQuery.data?.length}
          isLoading={tagsQuery.isPending}
          isError={tagsQuery.isError}
          loadingLabel={t.loadingGeneric}
          errorLabel={t.loadGenericError}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>{t.executionsPerDay}</CardTitle>
            <CardDescription>{t.usageTrend}</CardDescription>
          </CardHeader>
          <CardContent>
            {executionsPerDayQuery.isPending ? (
              <p className="text-sm text-muted-foreground">{t.loadingSeries}</p>
            ) : executionsPerDayQuery.isError ? (
              <p className="text-sm text-destructive">{t.loadExecPerDayError}</p>
            ) : executionsPerDayQuery.data && executionsPerDayQuery.data.length > 0 ? (
              <ChartContainer
                config={executionsChartConfig}
                className="aspect-auto h-[280px] w-full"
              >
                <AreaChart data={executionsPerDayQuery.data}>
                  <defs>
                    <linearGradient id="fillExecutions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-total)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--color-total)" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={24}
                    tickFormatter={(value) =>
                      new Date(value).toLocaleDateString(lang, { day: "2-digit", month: "2-digit" })
                    }
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        indicator="dot"
                        labelFormatter={(value) =>
                          new Date(value).toLocaleDateString(lang, {
                            day: "2-digit",
                            month: "long",
                          })
                        }
                      />
                    }
                  />
                  <Area
                    dataKey="total"
                    type="monotone"
                    stroke="var(--color-total)"
                    fill="url(#fillExecutions)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyTitle>{t.noExecutionsPeriod}</EmptyTitle>
                  <EmptyDescription>{t.runPromptHint}</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.topPrompts}</CardTitle>
            <CardDescription>{t.mostExecuted}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {topPromptsQuery.isPending ? (
              <p className="text-sm text-muted-foreground">{t.loadingRanking}</p>
            ) : topPromptsQuery.isError ? (
              <p className="text-sm text-destructive">{t.loadRankingError}</p>
            ) : topPromptsQuery.data && topPromptsQuery.data.length > 0 ? (
              topPromptsQuery.data.map((item, index) => (
                <Link
                  key={item.promptId}
                  href={`/${lang}/prompts/${item.promptId}`}
                  className="grid gap-1 rounded-lg border p-3 transition-colors hover:bg-accent cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">
                      {index + 1}. {item.promptTitle}
                    </span>
                    <span className="text-xs text-muted-foreground">{item.executions} {t.shortExec}</span>
                  </div>
                </Link>
              ))
            ) : (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyTitle>{t.noRankingYet}</EmptyTitle>
                  <EmptyDescription>{t.rankingHint}</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.costByModel}</CardTitle>
          <CardDescription>{t.costDistribution}</CardDescription>
        </CardHeader>
        <CardContent>
          {costPerModelQuery.isPending ? (
            <p className="text-sm text-muted-foreground">{t.loadingCost}</p>
          ) : costPerModelQuery.isError ? (
            <p className="text-sm text-destructive">{t.loadCostError}</p>
          ) : costPerModelQuery.data && costPerModelQuery.data.length > 0 ? (
            <ChartContainer
              config={costChartConfig}
              className="aspect-auto h-[320px] w-full"
            >
              <BarChart data={costPerModelQuery.data} layout="vertical" margin={{ left: 16, right: 16 }}>
                <CartesianGrid horizontal={false} />
                <YAxis
                  dataKey="model"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  width={120}
                />
                <XAxis dataKey="estimatedCost" type="number" tickLine={false} axisLine={false} />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      formatter={(value, name, item) => (
                        <div className="flex w-full items-center justify-between gap-3">
                          <span className="text-muted-foreground">{String(name)}</span>
                          <span className="font-mono font-medium">
                            {formatCurrency(Number(value ?? 0), lang)}
                            {" | "}
                            {item.payload.totalTokens.toLocaleString(lang)} tokens
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                <Bar
                  dataKey="estimatedCost"
                  fill="var(--color-estimatedCost)"
                  radius={6}
                  barSize={22}
                />
              </BarChart>
            </ChartContainer>
          ) : (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>{t.noCostPeriod}</EmptyTitle>
                <EmptyDescription>{t.noCostHint}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>{t.abHistory}</CardTitle>
            <CardDescription>{t.abVolume}</CardDescription>
          </CardHeader>
          <CardContent>
            {abHistoryQuery.isPending ? (
              <p className="text-sm text-muted-foreground">{t.loadingAbHistory}</p>
            ) : abHistoryQuery.isError ? (
              <p className="text-sm text-destructive">{t.loadAbHistoryError}</p>
            ) : abHistoryQuery.data && abHistoryQuery.data.length > 0 ? (
              <ChartContainer config={abHistoryChartConfig} className="aspect-auto h-[260px] w-full">
                <AreaChart data={abHistoryQuery.data}>
                  <defs>
                    <linearGradient id="fillAbVotes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-votes)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--color-votes)" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={24}
                    tickFormatter={(value) =>
                      new Date(value).toLocaleDateString(lang, { day: "2-digit", month: "2-digit" })
                    }
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        labelFormatter={(value) =>
                          new Date(value).toLocaleDateString(lang, { day: "2-digit", month: "long" })
                        }
                        formatter={(_value, _name, item) => (
                          <div className="grid gap-1 text-xs">
                            <span>Votos: {item.payload.votes}</span>
                            <span>Experimentos: {item.payload.experiments}</span>
                          </div>
                        )}
                      />
                    }
                  />
                  <Area
                    dataKey="votes"
                    type="monotone"
                    stroke="var(--color-votes)"
                    fill="url(#fillAbVotes)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyTitle>{t.noAbHistory}</EmptyTitle>
                  <EmptyDescription>{t.noAbHistoryHint}</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.abRanking}</CardTitle>
            <CardDescription>{t.mostVotes}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {abRankingQuery.isPending ? (
              <p className="text-sm text-muted-foreground">{t.loadingAbRanking}</p>
            ) : abRankingQuery.isError ? (
              <p className="text-sm text-destructive">{t.loadAbRankingError}</p>
            ) : abRankingQuery.data && abRankingQuery.data.length > 0 ? (
              abRankingQuery.data.map((item, index) => (
                <div key={item.experimentId} className="grid gap-1 rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">#{index + 1}</span>
                      <Badge
                        variant={item.status === "running" ? "default" : "secondary"}
                        className="shrink-0"
                      >
                        {item.status === "running"
                          ? experimentsI18n.status.running
                          : experimentsI18n.status.stopped}
                      </Badge>
                    </div>
                    <span className="text-muted-foreground">{item.totalVotes} {t.votes}</span>
                  </div>
                  <p className="text-muted-foreground">A: {item.promptATitle}</p>
                  <p className="text-muted-foreground">B: {item.promptBTitle}</p>
                  <p className="text-xs">
                    {t.winner}: <span className="font-medium">{item.winnerVariant}</span> ({item.winnerPercent}%)
                  </p>
                </div>
              ))
            ) : (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyTitle>{t.noAbRankingYet}</EmptyTitle>
                  <EmptyDescription>{t.noAbRankingHint}</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MetricCard({
  title,
  description,
  value,
  isLoading,
  isError,
  loadingLabel,
  errorLabel,
}: {
  title: string
  description: string
  value: number | string | undefined
  isLoading: boolean
  isError: boolean
  loadingLabel: string
  errorLabel: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{description}</CardDescription>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{loadingLabel}</p>
        ) : isError ? (
          <p className="text-sm text-destructive">{errorLabel}</p>
        ) : (
          <p className="text-2xl font-semibold">{value ?? "-"}</p>
        )}
      </CardContent>
    </Card>
  )
}

function formatCurrency(value: number | undefined, locale = "pt-BR") {
  if (typeof value !== "number") {
    return "-"
  }
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}
