"use client"

import { useQuery } from "@tanstack/react-query"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { parseAsString, useQueryState } from "nuqs"
import { useEffect, useMemo } from "react"
import type { Dictionary } from "@/app/[lang]/dictionaries"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { bffFetch } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/query-keys"
import type {
  AnalyticsCostPerModel,
  AnalyticsExecutionsPerDay,
  AnalyticsOverview,
  AnalyticsTopPrompt,
} from "@/lib/api/types"
import { useUiStore } from "@/stores/ui-store"

const periods = ["7d", "30d", "90d"] as const

function interpolate(template: string, params: Record<string, string>) {
  return Object.entries(params).reduce((current, [key, value]) => current.replaceAll(`{${key}}`, value), template)
}

export function AnalyticsPageClient({ dict, lang }: { dict: Dictionary; lang: string }) {
  const [period, setPeriod] = useQueryState("period", parseAsString.withDefault("30d"))
  const selectedPeriod = useUiStore((state) => state.selectedPeriod)
  const setSelectedPeriod = useUiStore((state) => state.setSelectedPeriod)

  useEffect(() => {
    if (period === "7d" || period === "30d" || period === "90d") {
      setSelectedPeriod(period)
    }
  }, [period, setSelectedPeriod])

  const periodValue = selectedPeriod
  const t = dict.analytics
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
        avgLatencyMs: {
          label: t.charts.avgLatencyMs,
          color: "var(--chart-3)",
        },
      }) satisfies ChartConfig,
    [t.charts.estimatedCost, t.charts.avgLatencyMs],
  )

  const overviewQuery = useQuery({
    queryKey: queryKeys.analytics.overview(periodValue),
    queryFn: () => bffFetch<AnalyticsOverview>(`/analytics/overview?period=${periodValue}`),
  })
  const executionsPerDayQuery = useQuery({
    queryKey: queryKeys.analytics.executionsPerDay(periodValue),
    queryFn: () =>
      bffFetch<AnalyticsExecutionsPerDay[]>(`/analytics/executions-per-day?period=${periodValue}`),
  })
  const costPerModelQuery = useQuery({
    queryKey: queryKeys.analytics.costPerModel(periodValue),
    queryFn: () => bffFetch<AnalyticsCostPerModel[]>(`/analytics/cost-per-model?period=${periodValue}`),
  })
  const topPromptsQuery = useQuery({
    queryKey: queryKeys.analytics.topPrompts(periodValue, 5),
    queryFn: () => bffFetch<AnalyticsTopPrompt[]>(`/analytics/top-prompts?period=${periodValue}&limit=5`),
  })

  const avgTokensPerExecution =
    overviewQuery.data && overviewQuery.data.executionsTotal > 0
      ? Math.round(overviewQuery.data.totalTokens / overviewQuery.data.executionsTotal)
      : 0
  const avgCostPerExecution =
    overviewQuery.data && overviewQuery.data.executionsTotal > 0
      ? overviewQuery.data.totalEstimatedCost / overviewQuery.data.executionsTotal
      : 0

  return (
    <div className="grid gap-4 px-4 lg:px-6">
      <div className="flex items-center gap-2">
        {periods.map((item) => (
          <Button
            key={item}
            variant={periodValue === item ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setPeriod(item)}
          >
            {item}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={t.executions}
          description={interpolate(t.executionsMetricDescription, { period: periodValue })}
          value={overviewQuery.data?.executionsTotal ?? 0}
          isPending={overviewQuery.isPending}
          isError={overviewQuery.isError}
          loadingLabel={t.loading}
          errorLabel={t.loadError}
        />
        <MetricCard
          label={t.tokens}
          description={t.totalConsumption}
          value={overviewQuery.data?.totalTokens ?? 0}
          isPending={overviewQuery.isPending}
          isError={overviewQuery.isError}
          loadingLabel={t.loading}
          errorLabel={t.loadError}
        />
        <MetricCard
          label={t.avgTokens}
          description={t.perExecution}
          value={avgTokensPerExecution}
          isPending={overviewQuery.isPending}
          isError={overviewQuery.isError}
          loadingLabel={t.loading}
          errorLabel={t.loadError}
        />
        <MetricCard
          label={t.avgCost}
          description={t.perExecution}
          value={formatCurrency(avgCostPerExecution, lang)}
          isPending={overviewQuery.isPending}
          isError={overviewQuery.isError}
          loadingLabel={t.loading}
          errorLabel={t.loadError}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>{t.executionsPerDay}</CardTitle>
            <CardDescription>{t.dayComparison}</CardDescription>
          </CardHeader>
          <CardContent>
            {executionsPerDayQuery.isPending ? (
              <p className="text-sm text-muted-foreground">{t.loadingSeries}</p>
            ) : executionsPerDayQuery.isError ? (
              <p className="text-sm text-destructive">{t.loadExecError}</p>
            ) : executionsPerDayQuery.data && executionsPerDayQuery.data.length > 0 ? (
              <ChartContainer config={executionsChartConfig} className="aspect-auto h-[280px] w-full">
                <AreaChart data={executionsPerDayQuery.data}>
                  <defs>
                    <linearGradient id="analyticsExecutionsFill" x1="0" y1="0" x2="0" y2="1">
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
                        labelFormatter={(value) =>
                          new Date(value).toLocaleDateString(lang, { day: "2-digit", month: "long" })
                        }
                      />
                    }
                  />
                  <Area
                    dataKey="total"
                    type="monotone"
                    stroke="var(--color-total)"
                    fill="url(#analyticsExecutionsFill)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyTitle>{t.noExecutionsPeriod}</EmptyTitle>
                  <EmptyDescription>{t.runToGenerateData}</EmptyDescription>
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
          <CardContent className="grid gap-2">
            {topPromptsQuery.isPending ? (
              <p className="text-sm text-muted-foreground">{t.loadingRanking}</p>
            ) : topPromptsQuery.isError ? (
              <p className="text-sm text-destructive">{t.loadTopError}</p>
            ) : topPromptsQuery.data && topPromptsQuery.data.length > 0 ? (
              topPromptsQuery.data.map((item, index) => (
                <div key={item.promptId} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium">
                      {index + 1}. {item.promptTitle}
                    </span>
                    <span className="text-muted-foreground">
                      {item.executions} {t.shortExec}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyTitle>{t.noRankedPrompts}</EmptyTitle>
                  <EmptyDescription>{t.runToRank}</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.costLatency}</CardTitle>
          <CardDescription>{t.costLatencyDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          {costPerModelQuery.isPending ? (
            <p className="text-sm text-muted-foreground">{t.loadingCost}</p>
          ) : costPerModelQuery.isError ? (
            <p className="text-sm text-destructive">{t.loadCostError}</p>
          ) : costPerModelQuery.data && costPerModelQuery.data.length > 0 ? (
            <ChartContainer config={costChartConfig} className="aspect-auto h-[340px] w-full">
              <BarChart data={costPerModelQuery.data} layout="vertical" margin={{ left: 16, right: 16 }}>
                <CartesianGrid horizontal={false} />
                <YAxis
                  dataKey="model"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  width={130}
                />
                <XAxis type="number" tickLine={false} axisLine={false} />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      formatter={(_value, _name, item) => (
                        <div className="grid gap-1 text-xs">
                          <span className="font-medium">{item.payload.model}</span>
                          <span>
                            {t.costLabel}: {formatCurrency(item.payload.estimatedCost, lang)}
                          </span>
                          <span>
                            {t.avgLatency}: {item.payload.avgLatencyMs} ms
                          </span>
                          <span>
                            {t.tooltipTokens}: {item.payload.totalTokens.toLocaleString(lang)}
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                <Bar dataKey="estimatedCost" fill="var(--color-estimatedCost)" radius={5} barSize={18} />
                <Bar dataKey="avgLatencyMs" fill="var(--color-avgLatencyMs)" radius={5} barSize={18} />
              </BarChart>
            </ChartContainer>
          ) : overviewQuery.data ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>{t.noCostRecorded}</EmptyTitle>
                <EmptyDescription>{t.noModelUsagePeriod}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <p className="text-sm text-muted-foreground">{t.loadingData}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({
  label,
  description,
  value,
  isPending,
  isError,
  loadingLabel,
  errorLabel,
}: {
  label: string
  description: string
  value: number | string
  isPending: boolean
  isError: boolean
  loadingLabel: string
  errorLabel: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{description}</CardDescription>
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <p className="text-sm text-muted-foreground">{loadingLabel}</p>
        ) : isError ? (
          <p className="text-sm text-destructive">{errorLabel}</p>
        ) : (
          <p className="text-2xl font-semibold">{value}</p>
        )}
      </CardContent>
    </Card>
  )
}

function formatCurrency(value: number, locale = "pt-BR") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}
