/**
 * Payloads de exemplo para teste de webhooks e documentação.
 */
export function getSamplePayloadForEvent(
  event: string,
): Record<string, unknown> {
  const samples: Record<string, Record<string, unknown>> = {
    'execution.completed': {
      executionId: '00000000-0000-4000-8000-000000000001',
      promptId: '00000000-0000-4000-8000-000000000002',
      model: 'gpt-4o-mini',
      workspaceId: '00000000-0000-4000-8000-000000000003',
    },
    'execution.failed': {
      promptId: '00000000-0000-4000-8000-000000000002',
      model: 'gpt-4o-mini',
      error: 'LLM request failed',
    },
    'prompt.created': {
      promptId: '00000000-0000-4000-8000-000000000002',
      workspaceId: '00000000-0000-4000-8000-000000000003',
      title: 'Exemplo',
    },
    'experiment.stopped': {
      experimentId: '00000000-0000-4000-8000-000000000004',
    },
    'dataset.run.completed': {
      datasetId: '00000000-0000-4000-8000-000000000005',
      runId: '00000000-0000-4000-8000-000000000006',
      promptId: '00000000-0000-4000-8000-000000000002',
    },
  };

  return (
    samples[event] ?? {
      message: 'Payload de teste',
      event,
    }
  );
}
