"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Dictionary } from "@/app/[lang]/dictionaries"
import { WEBHOOK_TEMPLATES } from "@/lib/webhooks/templates"
import type { WebhookCreateFormState } from "./webhook-form"

type Dict = Dictionary["webhooksPage"]

type Props = {
  dict: Dict
  onApply: (patch: Partial<WebhookCreateFormState>) => void
}

export function TemplateSelector({ dict, onApply }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{dict.templatesTitle}</CardTitle>
        <CardDescription>{dict.templatesDesc}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-3">
        {WEBHOOK_TEMPLATES.map((t) => (
          <Button
            key={t.id}
            type="button"
            variant="outline"
            className="h-auto flex-col items-start gap-1 py-3 whitespace-normal text-left"
            onClick={() =>
              onApply({
                url: t.url,
                events: [...t.events],
              })
            }
          >
            <span className="font-medium">{dict[t.nameKey as keyof Dict] as string}</span>
            <span className="text-muted-foreground text-xs font-normal">
              {dict[t.descriptionKey as keyof Dict] as string}
            </span>
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}
