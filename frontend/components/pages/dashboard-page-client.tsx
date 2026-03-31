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
          title="Prompts"
          description="Total de prompts ativos"
          value={overviewQuery.data?.promptsTotal}
          isLoading={overviewQuery.isPending}
          isError={overviewQuery.isError}
        />
        <MetricCard
          title="Execucoes"
          description={`Execucoes nos ultimos ${selectedPeriod}`}
          value={overviewQuery.data?.executionsTotal}
          isLoading={overviewQuery.isPending}
          isError={overviewQuery.isError}
        />
        <MetricCard
          title="Tokens"
          description={`Consumo total em ${selectedPeriod}`}
          value={overviewQuery.data?.totalTokens}
          isLoading={overviewQuery.isPending}
          isError={overviewQuery.isError}
        />
        <MetricCard
          title="Custo estimado"
          description={`Custo agregado em ${selectedPeriod}`}
          value={formatCurrency(overviewQuery.data?.totalEstimatedCost)}
          isLoading={overviewQuery.isPending}
          isError={overviewQuery.isError}
        />
        <MetricCard
          title="Workspaces"
          description="Espacos de organizacao"
          value={workspacesQuery.data?.length}
          isLoading={workspacesQuery.isPending}
          isError={workspacesQuery.isError}
        />
        <MetricCard
          title="Tags"
          description="Etiquetas cadastradas"
          value={tagsQuery.data?.length}
          isLoading={tagsQuery.isPending}
          isError={tagsQuery.isError}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Execucoes por dia</CardTitle>
            <CardDescription>Tendencia de uso no periodo selecionado</CardDescription>
          </CardHeader>
          <CardContent>
            {executionsPerDayQuery.isPending ? (
              <p className="text-sm text-muted-foreground">Carregando serie temporal...</p>
            ) : executionsPerDayQuery.isError ? (
              <p className="text-sm text-destructive">Falha ao carregar execucoes por dia.</p>
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
                      new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
                    }
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        indicator="dot"
                        labelFormatter={(value) =>
                          new Date(value).toLocaleDateString("pt-BR", {
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
                  <EmptyTitle>Sem execucoes no periodo</EmptyTitle>
                  <EmptyDescription>Rode um prompt para visualizar a curva de uso.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top prompts</CardTitle>
            <CardDescription>Mais executados no periodo</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {topPromptsQuery.isPending ? (
              <p className="text-sm text-muted-foreground">Carregando ranking...</p>
            ) : topPromptsQuery.isError ? (
              <p className="text-sm text-destructive">Falha ao carregar ranking de prompts.</p>
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
                    <span className="text-xs text-muted-foreground">{item.executions} exec.</span>
                  </div>
                </Link>
              ))
            ) : (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyTitle>Sem ranking ainda</EmptyTitle>
                  <EmptyDescription>Quando houver execucoes, o ranking aparece aqui.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Custo por modelo</CardTitle>
          <CardDescription>Distribuicao de custo entre modelos usados</CardDescription>
        </CardHeader>
        <CardContent>
          {costPerModelQuery.isPending ? (
            <p className="text-sm text-muted-foreground">Carregando distribuicao de custos...</p>
          ) : costPerModelQuery.isError ? (
            <p className="text-sm text-destructive">Falha ao carregar custo por modelo.</p>
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
                            {formatCurrency(Number(value ?? 0))}
                            {" | "}
                            {item.payload.totalTokens.toLocaleString("pt-BR")} tokens
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
                <EmptyTitle>Sem custo no periodo</EmptyTitle>
                <EmptyDescription>Nenhum consumo de modelo foi registrado ainda.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Historico A/B por dia</CardTitle>
            <CardDescription>Volume de votos de experimentos A/B no periodo</CardDescription>
          </CardHeader>
          <CardContent>
            {abHistoryQuery.isPending ? (
              <p className="text-sm text-muted-foreground">Carregando historico A/B...</p>
            ) : abHistoryQuery.isError ? (
              <p className="text-sm text-destructive">Falha ao carregar historico A/B.</p>
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
                      new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
                    }
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        labelFormatter={(value) =>
                          new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })
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
                  <EmptyTitle>Sem historico A/B no periodo</EmptyTitle>
                  <EmptyDescription>Crie experimentos e registre votos para popular este grafico.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ranking de experimentos A/B</CardTitle>
            <CardDescription>Experimentos com mais votos no periodo</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {abRankingQuery.isPending ? (
              <p className="text-sm text-muted-foreground">Carregando ranking A/B...</p>
            ) : abRankingQuery.isError ? (
              <p className="text-sm text-destructive">Falha ao carregar ranking A/B.</p>
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
                    <span className="text-muted-foreground">{item.totalVotes} votos</span>
                  </div>
                  <p className="text-muted-foreground">A: {item.promptATitle}</p>
                  <p className="text-muted-foreground">B: {item.promptBTitle}</p>
                  <p className="text-xs">
                    Vencedor: <span className="font-medium">{item.winnerVariant}</span> ({item.winnerPercent}%)
                  </p>
                </div>
              ))
            ) : (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyTitle>Sem ranking A/B ainda</EmptyTitle>
                  <EmptyDescription>Ainda nao ha votos de experimento no periodo selecionado.</EmptyDescription>
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
}: {
  title: string
  description: string
  value: number | string | undefined
  isLoading: boolean
  isError: boolean
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{description}</CardDescription>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : isError ? (
          <p className="text-sm text-destructive">Falha ao carregar.</p>
        ) : (
          <p className="text-2xl font-semibold">{value ?? "-"}</p>
        )}
      </CardContent>
    </Card>
  )
}

function formatCurrency(value: number | undefined) {
  if (typeof value !== "number") {
    return "-"
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(value)
}
