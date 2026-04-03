"use client"

import { useMutation, useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { bffFetch, ClientHttpError } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/query-keys"
import type { BillingUsage } from "@/lib/api/types"
import type { Dictionary } from "@/app/[lang]/dictionaries"

export function SettingsBillingSection({ dict }: { dict: Dictionary }) {
  const q = dict.settings.billingCard
  const usageQuery = useQuery({
    queryKey: queryKeys.settings.billingUsage,
    queryFn: () => bffFetch<BillingUsage>("/billing/usage"),
  })

  const checkout = useMutation({
    mutationFn: (tier: "pro" | "team") =>
      bffFetch<{ url: string }>("/billing/checkout", { method: "POST", body: { tier } }),
    onSuccess: (data) => {
      toast.message(q.checkoutStarted)
      window.location.href = data.url
    },
    onError: (e) => {
      const msg = e instanceof ClientHttpError ? e.message : String(e)
      toast.error(msg)
    },
  })

  const portal = useMutation({
    mutationFn: () => bffFetch<{ url: string }>("/billing/portal", { method: "POST", body: {} }),
    onSuccess: (data) => {
      toast.message(q.portalStarted)
      window.location.href = data.url
    },
    onError: (e) => {
      const msg = e instanceof ClientHttpError ? e.message : String(e)
      toast.error(msg)
    },
  })

  const pct =
    usageQuery.data && usageQuery.data.usageLimitExecutions > 0
      ? Math.min(100, (usageQuery.data.executionsThisPeriod / usageQuery.data.usageLimitExecutions) * 100)
      : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>{q.title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {usageQuery.isPending ? <p className="text-sm text-muted-foreground">{q.loading}</p> : null}
        {usageQuery.isError ? <p className="text-sm text-destructive">{q.loadError}</p> : null}
        {usageQuery.data ? (
          <>
            <div className="grid gap-1 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">{q.tier}</span>
                <span className="font-medium">{usageQuery.data.tier}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">{q.executions}</span>
                <span className="font-medium">
                  {usageQuery.data.executionsThisPeriod} / {usageQuery.data.usageLimitExecutions}
                </span>
              </div>
            </div>
            <Progress value={pct} className="h-2" />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="cursor-pointer"
                variant="default"
                disabled={checkout.isPending}
                onClick={() => checkout.mutate("pro")}
              >
                {q.upgradePro}
              </Button>
              <Button
                type="button"
                className="cursor-pointer"
                variant="secondary"
                disabled={checkout.isPending}
                onClick={() => checkout.mutate("team")}
              >
                {q.upgradeTeam}
              </Button>
              <Button
                type="button"
                className="cursor-pointer"
                variant="outline"
                disabled={portal.isPending || !usageQuery.data.stripeCustomerId}
                onClick={() => portal.mutate()}
              >
                {q.portal}
              </Button>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
