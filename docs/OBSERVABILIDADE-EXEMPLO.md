# Exemplo de Uso de Observabilidade no PromptsService

Este arquivo demonstra como adicionar observabilidade ao `PromptsService` existente.

## ❌ Antes (sem observabilidade)

```typescript
async create(userId: string, dto: CreatePromptDto) {
  const workspaceId = await this.resolveWorkspaceId(userId, dto.workspaceId);
  
  const created = await this.prisma.$transaction(async (tx) => {
    const prompt = await tx.prompt.create({
      data: {
        title: dto.title,
        content: dto.content,
        userId,
        workspaceId,
      },
    });
    return prompt;
  });

  return this.findOne(userId, created.id);
}
```

## ✅ Depois (com observabilidade completa)

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ObservabilityService } from '../observability/observability.service';
import { Trace } from '../observability/decorators/trace.decorator';

@Injectable()
export class PromptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly obs: ObservabilityService, // ✅ Injetar observability
  ) {}

  // ✅ Opção 1: Usar decorator @Trace para tracing automático
  @Trace('PromptsService.create')
  async create(userId: string, dto: CreatePromptDto) {
    // ✅ Log estruturado com contexto
    this.obs.info('Creating prompt', {
      userId,
      title: dto.title,
      isPublic: dto.isPublic,
      workspaceId: dto.workspaceId,
    });

    // ✅ Adicionar atributo customizado ao span
    this.obs.addSpanAttribute('prompt.title', dto.title);
    this.obs.addSpanAttribute('prompt.is_public', dto.isPublic ?? false);

    try {
      const workspaceId = await this.resolveWorkspaceId(userId, dto.workspaceId);
      
      if (dto.tagIds?.length) {
        await this.assertTagOwnership(userId, dto.tagIds);
      }

      // ✅ Adicionar evento ao span
      this.obs.addSpanEvent('starting-transaction', {
        tagCount: dto.tagIds?.length ?? 0,
      });

      const created = await this.prisma.$transaction(async (tx) => {
        const prompt = await tx.prompt.create({
          data: {
            title: dto.title,
            description: dto.description,
            content: dto.content,
            language: dto.language,
            model: dto.model,
            isPublic: dto.isPublic ?? false,
            isTemplate: dto.isTemplate ?? false,
            userId,
            workspaceId,
            tags: dto.tagIds?.length
              ? {
                  create: dto.tagIds.map((tagId) => ({ tagId })),
                }
              : undefined,
          },
        });

        await tx.promptVersion.create({
          data: {
            promptId: prompt.id,
            versionNumber: 1,
            content: dto.content,
          },
        });

        return prompt;
      });

      // ✅ Log de sucesso
      this.obs.info('Prompt created successfully', {
        promptId: created.id,
        userId,
      });

      return this.findOne(userId, created.id);
    } catch (error) {
      // ✅ Log de erro com contexto completo
      this.obs.error('Failed to create prompt', {
        error: error.message,
        userId,
        title: dto.title,
        stack: error.stack,
      });
      throw error;
    }
  }

  // ✅ Opção 2: Usar executeInSpan para controle manual completo
  async forkPrompt(userId: string, promptId: string) {
    return await this.obs.executeInSpan(
      'fork-prompt',
      async (span) => {
        // Adicionar atributos ao span
        span.setAttribute('user.id', userId);
        span.setAttribute('source.prompt_id', promptId);

        this.obs.info('Forking prompt', { userId, promptId });

        const original = await this.prisma.prompt.findUnique({
          where: { id: promptId },
          include: {
            versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
            variables: true,
            tags: true,
          },
        });

        if (!original || original.deletedAt || !original.isPublic) {
          this.obs.warn('Prompt not found or not public', { promptId });
          throw new NotFoundException('errors.publicPromptNotFound');
        }

        // Evento customizado
        this.obs.addSpanEvent('original-prompt-loaded', {
          variableCount: original.variables.length,
          tagCount: original.tags.length,
        });

        const workspaceId = await this.resolveWorkspaceId(userId);
        const latestVersion = original.versions[0];

        if (!latestVersion) {
          throw new NotFoundException('errors.promptWithoutVersionsForFork');
        }

        const forkedPrompt = await this.prisma.$transaction(async (tx) => {
          await tx.prompt.update({
            where: { id: promptId },
            data: { forkCount: { increment: 1 } },
          });

          const copy = await tx.prompt.create({
            data: {
              title: `${original.title} (Fork)`,
              description: original.description,
              content: latestVersion.content,
              language: original.language,
              model: original.model,
              isPublic: false,
              isTemplate: original.isTemplate,
              userId,
              workspaceId,
              forkedFromId: original.id,
            },
          });

          // Adicionar ID do fork ao span
          span.setAttribute('forked.prompt_id', copy.id);

          await tx.promptVersion.create({
            data: {
              promptId: copy.id,
              versionNumber: 1,
              content: latestVersion.content,
            },
          });

          if (original.variables.length > 0) {
            await tx.templateVariable.createMany({
              data: original.variables.map((variable) => ({
                promptId: copy.id,
                name: variable.name,
                type: variable.type,
                defaultValue: variable.defaultValue,
                options: variable.options ?? undefined,
                description: variable.description,
              })),
            });
          }

          if (original.tags.length > 0) {
            const userTagIds = await tx.tag.findMany({
              where: {
                userId,
                id: { in: original.tags.map((item) => item.tagId) },
              },
              select: { id: true },
            });

            if (userTagIds.length > 0) {
              await tx.promptTag.createMany({
                data: userTagIds.map((tag) => ({
                  promptId: copy.id,
                  tagId: tag.id,
                })),
              });
            }
          }

          return copy;
        });

        this.obs.info('Prompt forked successfully', {
          originalId: promptId,
          forkedId: forkedPrompt.id,
          userId,
        });

        return this.findOne(userId, forkedPrompt.id);
      },
      {
        operation: 'fork',
        userId,
      },
    );
  }
}
```

## 🎯 Benefícios

### 1. Logs Estruturados Correlacionados

Quando você faz um log usando `obs.info()`, automaticamente:
- ✅ O `traceId` é incluído no log
- ✅ O `spanId` é incluído no log
- ✅ Você pode clicar no log no Grafana e ir direto para o trace

### 2. Traces Detalhados

```
Trace: POST /api/v1/prompts
  ├─ Span: PromptsService.create (150ms)
  │   ├─ Event: starting-transaction (tagCount: 2)
  │   ├─ Span: resolveWorkspaceId (20ms)
  │   ├─ Span: assertTagOwnership (15ms)
  │   └─ Span: prisma.transaction (100ms)
  │       ├─ Span: prompt.create (60ms)
  │       └─ Span: promptVersion.create (40ms)
  └─ Span: findOne (25ms)
```

### 3. Correlação Automática

No Grafana, você pode:
1. Ver um erro nos logs
2. Clicar no `traceId` do log
3. Ver todo o trace da requisição que causou o erro
4. Ver todas as métricas (CPU, memória) no momento do erro

## 📊 Queries Úteis

### Encontrar logs de um trace específico
```logql
{service="promptzero-backend"} | json | traceId="abc123xyz"
```

### Encontrar traces lentos de criação de prompts
```traceql
{
  service.name="promptzero-backend" 
  && name="PromptsService.create" 
  && duration>1s
}
```

### Ver métricas de sucesso de forks
```promql
rate(http_requests_total{
  route="/api/v1/prompts/:id/fork",
  status!~"5.."
}[5m])
```

## 🔍 Debugging com Observabilidade

### Cenário: "Por que a criação de prompts está lenta?"

1. **Grafana → Explore → Tempo**
   ```traceql
   {service.name="promptzero-backend" && name="PromptsService.create"}
   ```
   Ordene por duração e veja os traces mais lentos

2. **Identifique o span mais lento**
   - Ex: `prisma.transaction` está levando 2s

3. **Correlacione com logs**
   - Clique em "Logs for this trace"
   - Veja o que estava acontecendo antes/durante

4. **Correlacione com métricas**
   - Veja CPU/memória no momento do trace lento

## 🚀 Próximos Passos

1. Adicione observability em todos os services críticos
2. Configure alertas para traces lentos (>1s)
3. Configure alertas para alta taxa de erros
4. Crie dashboards específicos por feature

## 📝 Template para Outros Services

```typescript
import { Injectable } from '@nestjs/common';
import { ObservabilityService } from '../observability/observability.service';
import { Trace } from '../observability/decorators/trace.decorator';

@Injectable()
export class YourService {
  constructor(
    private readonly obs: ObservabilityService,
  ) {}

  @Trace('YourService.yourMethod')
  async yourMethod(param: string) {
    this.obs.info('Starting operation', { param });

    try {
      this.obs.addSpanAttribute('custom.attribute', 'value');
      this.obs.addSpanEvent('checkpoint-1');

      const result = await this.doSomething(param);

      this.obs.info('Operation completed', { result });
      return result;
    } catch (error) {
      this.obs.error('Operation failed', {
        error: error.message,
        param,
      });
      throw error;
    }
  }
}
```
