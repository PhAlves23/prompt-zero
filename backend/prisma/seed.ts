import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Password@123', 10);

  const user = await prisma.user.upsert({
    where: { email: 'admin@promptvault.com' },
    update: {},
    create: {
      name: 'Admin PromptVault',
      email: 'admin@promptvault.com',
      passwordHash,
    },
  });

  const defaultWorkspace = await prisma.workspace.upsert({
    where: {
      userId_name: {
        userId: user.id,
        name: 'Padrão',
      },
    },
    update: {},
    create: {
      name: 'Padrão',
      description: 'Workspace padrão do usuário',
      color: '#4F46E5',
      isDefault: true,
      userId: user.id,
    },
  });

  const marketingTag = await prisma.tag.upsert({
    where: { userId_slug: { userId: user.id, slug: 'marketing' } },
    update: {},
    create: {
      name: 'Marketing',
      slug: 'marketing',
      color: '#EF4444',
      userId: user.id,
    },
  });

  const prompt = await prisma.prompt.create({
    data: {
      title: 'Copy para anúncio no Instagram',
      description: 'Template para geração de copy curta com CTA',
      content:
        'Crie uma copy para anunciar {{produto}} para {{publico}} com tom {{tom}} e CTA {{cta}}.',
      model: 'gpt-4o-mini',
      language: 'pt',
      isTemplate: true,
      userId: user.id,
      workspaceId: defaultWorkspace.id,
      versions: {
        create: {
          versionNumber: 1,
          content:
            'Crie uma copy para anunciar {{produto}} para {{publico}} com tom {{tom}} e CTA {{cta}}.',
        },
      },
      variables: {
        create: [
          { name: 'produto', type: 'text', description: 'Nome do produto' },
          { name: 'publico', type: 'text', description: 'Público-alvo' },
          { name: 'tom', type: 'select', options: ['casual', 'formal'] },
          { name: 'cta', type: 'text', defaultValue: 'Compre agora' },
        ],
      },
    },
  });

  await prisma.promptTag.upsert({
    where: { promptId_tagId: { promptId: prompt.id, tagId: marketingTag.id } },
    update: {},
    create: {
      promptId: prompt.id,
      tagId: marketingTag.id,
    },
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
