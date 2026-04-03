"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Dictionary } from "@/app/[lang]/dictionaries"

export function PricingPageClient({ lang, dict }: { lang: string; dict: Dictionary }) {
  const p = dict.pricingPage
  const tiers = [
    { name: p.free, desc: "50k exec/mês (exemplo)" },
    { name: p.pro, desc: "US$ 49/mês (exemplo)" },
    { name: p.team, desc: "US$ 199/mês + SSO/RBAC" },
    { name: p.enterprise, desc: "Custom + compliance" },
  ]

  return (
    <div className="mx-auto grid max-w-4xl gap-6 px-4 py-8 lg:px-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">{p.title}</h1>
        <p className="mt-2 text-muted-foreground">{p.subtitle}</p>
        <p className="mt-2 text-sm text-muted-foreground">{p.note}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {tiers.map((t) => (
          <Card key={t.name}>
            <CardHeader>
              <CardTitle>{t.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{t.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Button asChild className="w-fit cursor-pointer">
        <Link href={`/${lang}/settings?tab=billing`}>{p.cta}</Link>
      </Button>
    </div>
  )
}
