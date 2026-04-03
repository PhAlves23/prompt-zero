import type { WebhookEventId } from "./events"

export type WebhookTemplate = {
  id: string
  nameKey: string
  descriptionKey: string
  url: string
  events: WebhookEventId[]
}

export const WEBHOOK_TEMPLATES: WebhookTemplate[] = [
  {
    id: "slack",
    nameKey: "templateSlackName",
    descriptionKey: "templateSlackDesc",
    url: "https://hooks.slack.com/services/XXX/YYY/ZZZ",
    events: ["execution.completed", "dataset.run.failed"],
  },
  {
    id: "discord",
    nameKey: "templateDiscordName",
    descriptionKey: "templateDiscordDesc",
    url: "https://discord.com/api/webhooks/ID/TOKEN",
    events: ["experiment.stopped", "prompt.created"],
  },
  {
    id: "zapier",
    nameKey: "templateZapierName",
    descriptionKey: "templateZapierDesc",
    url: "https://hooks.zapier.com/hooks/catch/123456/abcdef/",
    events: ["execution.completed"],
  },
]
