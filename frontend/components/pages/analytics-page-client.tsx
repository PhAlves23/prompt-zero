"use client"

import { useQuery } from "@tanstack/react-query"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { parseAsString, useQueryState } from "nuqs"
import { useEffect } from "react"
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
  avgLatencyMs: {
    label: "Latencia",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

export function AnalyticsPageClient() {
  const [period, setPeriod] = useQueryState("period", parseAsString.withDefault("30d"))
  const selectedPeriod = useUiStore((state) => state.selectedPeriod)
  const setSelectedPeriod = useUiStore((state) => state.setSelectedPeriod)

  useEffect(() => {
    if (period === "7d" || period === "30d" || period === "90d") {
      setSelectedPeriod(period)
    }
  }, [period, setSelectedPeriod])

  const periodValue = selectedPeriod
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
          label="Execucoes"
          description={`Total no periodo ${periodValue}`}
          value={overviewQuery.data?.executionsTotal ?? 0}
          isPending={overviewQuery.isPending}
          isError={overviewQuery.isError}
        />
        <MetricCard
          label="Tokens"
          description="Consumo total"
          value={overviewQuery.data?.totalTokens ?? 0}
          isPending={overviewQuery.isPending}
          isError={overviewQuery.isError}
        />
        <MetricCard
          label="Media de tokens"
          description="Por execucao"
          value={avgTokensPerExecution}
          isPending={overviewQuery.isPending}
          isError={overviewQuery.isError}
        />
        <MetricCard
          label="Custo medio"
          description="Por execucao"
          value={formatCurrency(avgCostPerExecution)}
          isPending={overviewQuery.isPending}
          isError={overviewQuery.isError}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Execucoes por dia</CardTitle>
            <CardDescription>Comparativo diario para identificar sazonalidade</CardDescription>
          </CardHeader>
          <CardContent>
            {executionsPerDayQuery.isPending ? (
              <p className="text-sm text-muted-foreground">Carregando serie de execucoes...</p>
            ) : executionsPerDayQuery.isError ? (
              <p className="text-sm text-destructive">Falha ao carregar execucoes por dia.</p>
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
                  <EmptyTitle>Sem execucoes no periodo</EmptyTitle>
                  <EmptyDescription>Execute alguns prompts para gerar dados.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top prompts</CardTitle>
            <CardDescription>Mais executados</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {topPromptsQuery.isPending ? (
              <p className="text-sm text-muted-foreground">Carregando ranking...</p>
            ) : topPromptsQuery.isError ? (
              <p className="text-sm text-destructive">Falha ao carregar top prompts.</p>
            ) : topPromptsQuery.data && topPromptsQuery.data.length > 0 ? (
              topPromptsQuery.data.map((item, index) => (
                <div key={item.promptId} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium">
                      {index + 1}. {item.promptTitle}
                    </span>
                    <span className="text-muted-foreground">{item.executions} exec.</span>
                  </div>
                </div>
              ))
            ) : (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyTitle>Sem prompts ranqueados</EmptyTitle>
                  <EmptyDescription>Execute prompts para aparecer no ranking.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Custo e latencia por modelo</CardTitle>
          <CardDescription>Qual modelo custa mais e qual responde mais rapido</CardDescription>
        </CardHeader>
        <CardContent>
          {costPerModelQuery.isPending ? (
            <p className="text-sm text-muted-foreground">Carregando custo por modelo...</p>
          ) : costPerModelQuery.isError ? (
            <p className="text-sm text-destructive">Falha ao carregar custo por modelo.</p>
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
                          <span>Custo: {formatCurrency(item.payload.estimatedCost)}</span>
                          <span>Latencia media: {item.payload.avgLatencyMs} ms</span>
                          <span>Tokens: {item.payload.totalTokens.toLocaleString("pt-BR")}</span>
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
                <EmptyTitle>Sem custo registrado</EmptyTitle>
                <EmptyDescription>Sem consumo de modelos no periodo selecionado.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <p className="text-sm text-muted-foreground">Carregando dados...</p>
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
}: {
  label: string
  description: string
  value: number | string
  isPending: boolean
  isError: boolean
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{description}</CardDescription>
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : isError ? (
          <p className="text-sm text-destructive">Falha ao carregar.</p>
        ) : (
          <p className="text-2xl font-semibold">{value}</p>
        )}
      </CardContent>
    </Card>
  )
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(value)
}
