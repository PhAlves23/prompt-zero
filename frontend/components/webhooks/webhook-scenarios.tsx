"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Dictionary } from "@/app/[lang]/dictionaries"
import type { WebhookCreateFormState } from "./webhook-form"

type Dict = Dictionary["webhooksPage"]

type Scenario = {
  id: string
  titleKey: keyof Dict
  descKey: keyof Dict
  url: string
  events: string[]
  filtersText: string
}

const SCENARIOS: Scenario[] = [
  {
    id: "slack-failures",
    titleKey: "scenarioSlackFailuresTitle",
    descKey: "scenarioSlackFailuresDesc",
    url: "https://hooks.slack.com/services/XXX/YYY/ZZZ",
    events: ["dataset.run.failed"],
    filtersText: "",
  },
  {
    id: "pipeline-exp",
    titleKey: "scenarioPipelineTitle",
    descKey: "scenarioPipelineDesc",
    url: "https://api.seudominio.com/webhooks/experiment",
    events: ["experiment.stopped"],
    filtersText: "",
  },
  {
    id: "audit-prompts",
    titleKey: "scenarioAuditTitle",
    descKey: "scenarioAuditDesc",
    url: "https://audit.seudominio.com/promptzero",
    events: ["prompt.created", "prompt.updated", "prompt.deleted"],
    filtersText: "",
  },
]

type Props = {
  dict: Dict
  onApply: (patch: Partial<WebhookCreateFormState>) => void
}

export function WebhookScenarios({ dict, onApply }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{dict.scenariosTitle}</CardTitle>
        <CardDescription>{dict.scenariosDesc}</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {SCENARIOS.map((s) => (
            <AccordionItem key={s.id} value={s.id}>
              <AccordionTrigger className="text-left text-sm">
                {dict[s.titleKey] as string}
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>{dict[s.descKey] as string}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    onApply({
                      url: s.url,
                      events: [...s.events],
                      filtersText: s.filtersText,
                    })
                  }
                >
                  {dict.scenarioUse}
                </Button>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  )
}
