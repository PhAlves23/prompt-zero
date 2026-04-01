"use client"

import Link from "next/link"
import { useMemo } from "react"
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
import type { Dictionary } from "@/app/[lang]/dictionaries"
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

const periods = ["7d", "30d", "90d"] as const

export function DashboardPageClient({
  lang,
  dict,
}: {
  lang: string
  dict: Dictionary
}) {
  const [period, setPeriod] = useQueryState("period", parseAsString.withDefault("30d"))
  const t = dict.dashboard
  const executionsChartConfig = useMemo(
    () =>
      ({
        total: {
          label: t.charts.executions,
          color: "var(--primary)",
        },
      }) satisfies ChartConfig,
    [t.charts.executions],
  )
  const costChartConfig = useMemo(
    () =>
      ({
        estimatedCost: {
          label: t.charts.estimatedCost,
          color: "var(--chart-2)",
        },
      }) satisfies ChartConfig,
    [t.charts.estimatedCost],
  )
  const abHistoryChartConfig = useMemo(
    () =>
      ({
        votes: {
          label: t.charts.abVotes,
          color: "var(--chart-4)",
        },
      }) satisfies ChartConfig,
    [t.charts.abVotes],
  )
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
                            {item.payload.totalTokens.toLocaleString(lang)} {t.tokens}
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
                            <span>
                              {t.tooltipVotes}: {item.payload.votes}
                            </span>
                            <span>
                              {t.tooltipExperiments}: {item.payload.experiments}
                            </span>
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
                          ? dict.experiments.status.running
                          : dict.experiments.status.stopped}
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
