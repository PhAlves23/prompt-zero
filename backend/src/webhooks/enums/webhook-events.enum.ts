/**
 * Eventos de webhook suportados (sincronizar com frontend/lib/webhooks/events.ts).
 */
export const WEBHOOK_EVENTS = [
  'execution.completed',
  'execution.failed',
  'execution.evaluated',
  'prompt.created',
  'prompt.updated',
  'prompt.deleted',
  'prompt.forked',
  'prompt.version.created',
  'prompt.version.deleted',
  'prompt.version.restored',
  'prompt.template_variables.synced',
  'experiment.created',
  'experiment.exposure.created',
  'experiment.voted',
  'experiment.stopped',
  'dataset.created',
  'dataset.updated',
  'dataset.deleted',
  'dataset.run.created',
  'dataset.run.started',
  'dataset.run.completed',
  'dataset.run.failed',
  'workspace.created',
  'workspace.updated',
  'workspace.deleted',
  'workspace.member.invited',
  'workspace.member.updated',
  'workspace.member.removed',
  'evaluation.criteria.created',
  'comment.created',
  'tag.created',
  'tag.updated',
  'tag.deleted',
  'trace.ingested',
  'platform_api_key.created',
  'platform_api_key.revoked',
  'user.profile.updated',
  'user.provider_credential.created',
  'user.provider_credential.updated',
  'user.provider_credential.deleted',
  'subscription.updated',
  'webhook_endpoint.created',
  'webhook_endpoint.deleted',
] as const;

export type WebhookEventName = (typeof WEBHOOK_EVENTS)[number];

export function isWebhookEventName(value: string): value is WebhookEventName {
  return (WEBHOOK_EVENTS as readonly string[]).includes(value);
}
