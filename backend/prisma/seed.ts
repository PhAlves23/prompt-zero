import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

type WeightedItem<T> = {
  item: T;
  weight: number;
};

type SeedPrompt = {
  key: string;
  title: string;
  description: string;
  content: string;
  model: string;
  language: 'pt' | 'en' | 'es';
  workspaceName: string;
  tagSlugs: string[];
  isTemplate?: boolean;
  variables?: Array<{
    name: string;
    type: 'text' | 'textarea' | 'select';
    defaultValue?: string;
    options?: string[];
    description?: string;
  }>;
};

function seededUnit(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453123;
  return x - Math.floor(x);
}

function weightedPick<T>(items: Array<WeightedItem<T>>, seed: number): T {
  const totalWeight = items.reduce((acc, current) => acc + current.weight, 0);
  const threshold = seededUnit(seed) * totalWeight;
  let cursor = 0;
  for (const entry of items) {
    cursor += entry.weight;
    if (threshold <= cursor) {
      return entry.item;
    }
  }
  return items[items.length - 1].item;
}

async function main() {
  const passwordHash = await bcrypt.hash('Password@123', 10);

  const user = await prisma.user.upsert({
    where: { email: 'admin@promptvault.com' },
    update: {
      name: 'Admin PromptVault',
      passwordHash,
    },
    create: {
      name: 'Admin PromptVault',
      email: 'admin@promptvault.com',
      passwordHash,
    },
  });

  const workspacesSeed = [
    {
      name: 'Default',
      description: 'Workspace principal com prompts operacionais do dia a dia',
      color: '#4F46E5',
      isDefault: true,
    },
    {
      name: 'Growth',
      description: 'Campanhas de aquisicao, anuncios e email marketing',
      color: '#16A34A',
      isDefault: false,
    },
    {
      name: 'Support',
      description: 'Respostas padrao, scripts de atendimento e base de suporte',
      color: '#0EA5E9',
      isDefault: false,
    },
  ] as const;

  const workspaceByName = new Map<string, { id: string }>();
  for (const workspaceSeed of workspacesSeed) {
    const workspace = await prisma.workspace.upsert({
      where: {
        userId_name: {
          userId: user.id,
          name: workspaceSeed.name,
        },
      },
      update: {
        description: workspaceSeed.description,
        color: workspaceSeed.color,
        isDefault: workspaceSeed.isDefault,
      },
      create: {
        name: workspaceSeed.name,
        description: workspaceSeed.description,
        color: workspaceSeed.color,
        isDefault: workspaceSeed.isDefault,
        userId: user.id,
      },
    });
    workspaceByName.set(workspaceSeed.name, { id: workspace.id });
  }

  const tagsSeed = [
    { name: 'Marketing', slug: 'marketing', color: '#EF4444' },
    { name: 'Vendas', slug: 'vendas', color: '#F97316' },
    { name: 'Produto', slug: 'produto', color: '#8B5CF6' },
    { name: 'Suporte', slug: 'suporte', color: '#06B6D4' },
    { name: 'Social', slug: 'social', color: '#22C55E' },
  ] as const;

  const tagIdBySlug = new Map<string, string>();
  for (const tagSeed of tagsSeed) {
    const tag = await prisma.tag.upsert({
      where: { userId_slug: { userId: user.id, slug: tagSeed.slug } },
      update: {
        name: tagSeed.name,
        color: tagSeed.color,
      },
      create: {
        name: tagSeed.name,
        slug: tagSeed.slug,
        color: tagSeed.color,
        userId: user.id,
      },
    });
    tagIdBySlug.set(tagSeed.slug, tag.id);
  }

  const promptsSeed: SeedPrompt[] = [
    {
      key: 'instagram-copy',
      title: 'Copy para anuncio no Instagram',
      description:
        'Template para gerar copy curta com CTA para campanhas de social media',
      content:
        'Crie uma copy para anunciar {{produto}} para {{publico}} com tom {{tom}} e CTA {{cta}}.',
      model: 'gpt-4o-mini',
      language: 'pt',
      workspaceName: 'Growth',
      tagSlugs: ['marketing', 'social'],
      isTemplate: true,
      variables: [
        { name: 'produto', type: 'text', description: 'Nome do produto' },
        { name: 'publico', type: 'text', description: 'Publico-alvo' },
        {
          name: 'tom',
          type: 'select',
          options: ['casual', 'profissional', 'descontraido'],
          description: 'Tom principal da copy',
        },
        { name: 'cta', type: 'text', defaultValue: 'Compre agora' },
      ],
    },
    {
      key: 'cold-email-b2b',
      title: 'Cold email B2B personalizado',
      description:
        'Sequencia de outreach para prospeccao ativa com personalizacao por segmento',
      content:
        'Escreva um cold email para {{empresa}} destacando {{dor_principal}} e sugerindo {{proxima_acao}}.',
      model: 'claude-3-5-sonnet',
      language: 'pt',
      workspaceName: 'Growth',
      tagSlugs: ['vendas'],
      isTemplate: true,
      variables: [
        { name: 'empresa', type: 'text' },
        { name: 'dor_principal', type: 'textarea' },
        {
          name: 'proxima_acao',
          type: 'text',
          defaultValue: 'uma call de 20 minutos',
        },
      ],
    },
    {
      key: 'release-notes',
      title: 'Release notes para funcionalidades',
      description:
        'Estrutura para comunicar novas features com impacto e orientacoes claras',
      content:
        'Gere release notes para a feature {{feature}} com impactos, beneficios e passos de uso.',
      model: 'gpt-4o',
      language: 'pt',
      workspaceName: 'Default',
      tagSlugs: ['produto'],
    },
    {
      key: 'support-reply',
      title: 'Resposta de suporte empatica',
      description:
        'Resposta para tickets com tom acolhedor, resumo do problema e proximos passos',
      content:
        'Crie uma resposta para o ticket {{ticket_id}} explicando {{problema}} e oferecendo {{proximo_passo}}.',
      model: 'gemini-1.5-flash',
      language: 'pt',
      workspaceName: 'Support',
      tagSlugs: ['suporte'],
    },
    {
      key: 'seo-article-outline',
      title: 'Outline de artigo SEO',
      description:
        'Gera estrutura de artigo com headings e intencao de busca por palavra-chave',
      content:
        'Monte um outline SEO para o tema {{tema}} considerando palavra-chave {{keyword}} e publico {{publico}}.',
      model: 'openrouter/default',
      language: 'pt',
      workspaceName: 'Default',
      tagSlugs: ['marketing', 'produto'],
      isTemplate: true,
      variables: [
        { name: 'tema', type: 'text' },
        { name: 'keyword', type: 'text' },
        { name: 'publico', type: 'text', defaultValue: 'gestores de produto' },
      ],
    },
  ];

  const seededPromptIds: string[] = [];
  const promptIdByKey = new Map<string, string>();

  for (const seedPrompt of promptsSeed) {
    const workspaceId = workspaceByName.get(seedPrompt.workspaceName)?.id;
    if (!workspaceId) {
      throw new Error(
        `Workspace nao encontrado para seed: ${seedPrompt.workspaceName}`,
      );
    }

    const existingPrompt = await prisma.prompt.findFirst({
      where: {
        userId: user.id,
        title: seedPrompt.title,
      },
      select: { id: true },
    });

    const prompt = existingPrompt
      ? await prisma.prompt.update({
          where: { id: existingPrompt.id },
          data: {
            description: seedPrompt.description,
            content: seedPrompt.content,
            model: seedPrompt.model,
            language: seedPrompt.language,
            isTemplate: seedPrompt.isTemplate ?? false,
            isPublic: false,
            workspaceId,
            deletedAt: null,
          },
          select: { id: true },
        })
      : await prisma.prompt.create({
          data: {
            title: seedPrompt.title,
            description: seedPrompt.description,
            content: seedPrompt.content,
            model: seedPrompt.model,
            language: seedPrompt.language,
            isTemplate: seedPrompt.isTemplate ?? false,
            isPublic: false,
            userId: user.id,
            workspaceId,
          },
          select: { id: true },
        });

    await prisma.promptVersion.upsert({
      where: {
        promptId_versionNumber: {
          promptId: prompt.id,
          versionNumber: 1,
        },
      },
      update: {
        content: seedPrompt.content,
      },
      create: {
        promptId: prompt.id,
        versionNumber: 1,
        content: seedPrompt.content,
      },
    });

    await prisma.templateVariable.deleteMany({
      where: { promptId: prompt.id },
    });

    if (seedPrompt.variables?.length) {
      await prisma.templateVariable.createMany({
        data: seedPrompt.variables.map((variable) => ({
          promptId: prompt.id,
          name: variable.name,
          type: variable.type,
          defaultValue: variable.defaultValue,
          options: variable.options,
          description: variable.description,
        })),
      });
    }

    await prisma.promptTag.deleteMany({
      where: { promptId: prompt.id },
    });

    const tagIds = seedPrompt.tagSlugs
      .map((slug) => tagIdBySlug.get(slug))
      .filter((tagId): tagId is string => Boolean(tagId));

    if (tagIds.length > 0) {
      await prisma.promptTag.createMany({
        data: tagIds.map((tagId) => ({
          promptId: prompt.id,
          tagId,
        })),
      });
    }

    seededPromptIds.push(prompt.id);
    promptIdByKey.set(seedPrompt.key, prompt.id);
  }

  await prisma.execution.deleteMany({
    where: {
      userId: user.id,
      promptId: { in: seededPromptIds },
    },
  });

  const promptVersions = await prisma.promptVersion.findMany({
    where: {
      promptId: { in: seededPromptIds },
      versionNumber: 1,
    },
    select: {
      id: true,
      promptId: true,
    },
  });
  const versionIdByPromptId = new Map(
    promptVersions.map((promptVersion) => [
      promptVersion.promptId,
      promptVersion.id,
    ]),
  );

  const modelProfiles = {
    'gpt-4o-mini': {
      provider: 'openai',
      inputCost: 0.00015,
      outputCost: 0.0006,
      latencyBase: 750,
    },
    'gpt-4o': {
      provider: 'openai',
      inputCost: 0.005,
      outputCost: 0.015,
      latencyBase: 1500,
    },
    'claude-3-5-sonnet': {
      provider: 'anthropic',
      inputCost: 0.003,
      outputCost: 0.015,
      latencyBase: 1750,
    },
    'gemini-1.5-flash': {
      provider: 'google',
      inputCost: 0.00035,
      outputCost: 0.00105,
      latencyBase: 600,
    },
    'openrouter/default': {
      provider: 'openrouter',
      inputCost: 0.001,
      outputCost: 0.002,
      latencyBase: 980,
    },
  } as const;
  type ModelName = keyof typeof modelProfiles;

  const promptMix = [
    { key: 'instagram-copy', weight: 32 },
    { key: 'cold-email-b2b', weight: 22 },
    { key: 'release-notes', weight: 18 },
    { key: 'support-reply', weight: 16 },
    { key: 'seo-article-outline', weight: 12 },
  ] as const;

  const modelMix: Array<WeightedItem<ModelName>> = [
    { item: 'gpt-4o-mini', weight: 38 },
    { item: 'claude-3-5-sonnet', weight: 18 },
    { item: 'gpt-4o', weight: 14 },
    { item: 'gemini-1.5-flash', weight: 20 },
    { item: 'openrouter/default', weight: 10 },
  ];

  const modelMixLast7Days: Array<WeightedItem<ModelName>> = [
    { item: 'gpt-4o', weight: 30 },
    { item: 'claude-3-5-sonnet', weight: 30 },
    { item: 'gpt-4o-mini', weight: 20 },
    { item: 'gemini-1.5-flash', weight: 10 },
    { item: 'openrouter/default', weight: 10 },
  ];

  const now = new Date();
  const startDate = new Date(now);
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - 89);

  const executionData: Array<{
    provider: 'openai' | 'anthropic' | 'google' | 'openrouter';
    input: string;
    output: string;
    model: string;
    temperature: number;
    maxTokens: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    latencyMs: number;
    estimatedCost: string;
    variables: object;
    promptId: string;
    promptVersionId: string;
    userId: string;
    createdAt: Date;
  }> = [];

  for (let dayIndex = 0; dayIndex < 90; dayIndex += 1) {
    const isLast7Days = dayIndex >= 83;
    const trend = dayIndex * 0.07;
    const seasonal =
      Math.sin(dayIndex / 5) * 1.8 + Math.cos(dayIndex / 9) * 1.2;
    const weeklyPattern = [-1, 0, 1, 2, 1, 3, -2][dayIndex % 7];
    const last7DaysBoost = isLast7Days
      ? 8 + Math.round(seededUnit(dayIndex + 991) * 5)
      : 0;
    const executionsCount = Math.max(
      3,
      Math.round(7 + trend + seasonal + weeklyPattern + last7DaysBoost),
    );

    for (
      let executionIndex = 0;
      executionIndex < executionsCount;
      executionIndex += 1
    ) {
      const seed = dayIndex * 1000 + executionIndex * 17 + 13;

      const promptKey = weightedPick(
        promptMix.map((entry) => ({ item: entry.key, weight: entry.weight })),
        seed,
      );
      const promptId = promptIdByKey.get(promptKey);
      if (!promptId) {
        continue;
      }

      const promptVersionId = versionIdByPromptId.get(promptId);
      if (!promptVersionId) {
        continue;
      }

      const model = weightedPick(
        isLast7Days ? modelMixLast7Days : modelMix,
        seed + 1,
      );

      const profile = modelProfiles[model];
      const inputTokens = Math.max(
        110,
        Math.round(
          (180 + seededUnit(seed + 2) * 1200) * (isLast7Days ? 1.22 : 1),
        ),
      );
      const outputTokens = Math.max(
        80,
        Math.round(
          (120 + seededUnit(seed + 3) * 900) * (isLast7Days ? 1.3 : 1),
        ),
      );
      const totalTokens = inputTokens + outputTokens;
      const cost =
        (inputTokens / 1000) * profile.inputCost +
        (outputTokens / 1000) * profile.outputCost;
      const latencyMs = Math.round(
        profile.latencyBase + seededUnit(seed + 4) * 1200,
      );
      const temperature = Number((0.2 + seededUnit(seed + 5) * 0.7).toFixed(2));
      const maxTokens = 1024 + Math.round(seededUnit(seed + 6) * 2048);

      const executionDate = new Date(startDate);
      executionDate.setDate(startDate.getDate() + dayIndex);
      executionDate.setHours(Math.floor(seededUnit(seed + 7) * 24));
      executionDate.setMinutes(Math.floor(seededUnit(seed + 8) * 60));
      executionDate.setSeconds(Math.floor(seededUnit(seed + 9) * 60));

      executionData.push({
        provider: profile.provider,
        input: `Seed input ${promptKey} #${dayIndex}-${executionIndex}`,
        output: `Seed output gerado para ${promptKey} no dia ${dayIndex + 1}`,
        model,
        temperature,
        maxTokens,
        inputTokens,
        outputTokens,
        totalTokens,
        latencyMs,
        estimatedCost: cost.toFixed(6),
        variables: { source: 'seed', promptKey, dayIndex },
        promptId,
        promptVersionId,
        userId: user.id,
        createdAt: executionDate,
      });
    }
  }

  if (executionData.length > 0) {
    await prisma.execution.createMany({
      data: executionData,
    });
  }

  await prisma.providerModelPricing.deleteMany({
    where: {
      OR: [
        { provider: 'openai', model: 'gpt-4o-mini' },
        { provider: 'openai', model: 'gpt-4o' },
        { provider: 'anthropic', model: 'claude-3-5-sonnet' },
        { provider: 'anthropic', model: 'claude-3-haiku' },
        { provider: 'google', model: 'gemini-1.5-pro' },
        { provider: 'google', model: 'gemini-1.5-flash' },
        { provider: 'openrouter', model: 'openrouter/default' },
      ],
    },
  });

  await prisma.providerModelPricing.createMany({
    data: [
      {
        provider: 'openai',
        model: 'gpt-4o-mini',
        inputCostPer1k: '0.000150',
        outputCostPer1k: '0.000600',
      },
      {
        provider: 'openai',
        model: 'gpt-4o',
        inputCostPer1k: '0.005000',
        outputCostPer1k: '0.015000',
      },
      {
        provider: 'anthropic',
        model: 'claude-3-5-sonnet',
        inputCostPer1k: '0.003000',
        outputCostPer1k: '0.015000',
      },
      {
        provider: 'anthropic',
        model: 'claude-3-haiku',
        inputCostPer1k: '0.000250',
        outputCostPer1k: '0.001250',
      },
      {
        provider: 'google',
        model: 'gemini-1.5-pro',
        inputCostPer1k: '0.003500',
        outputCostPer1k: '0.010500',
      },
      {
        provider: 'google',
        model: 'gemini-1.5-flash',
        inputCostPer1k: '0.000350',
        outputCostPer1k: '0.001050',
      },
      {
        provider: 'openrouter',
        model: 'openrouter/default',
        inputCostPer1k: '0.001000',
        outputCostPer1k: '0.002000',
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
