import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { createHmac, randomBytes } from 'crypto';

@Injectable()
export class WebhooksService {
  constructor(private readonly prisma: PrismaService) {}

  private sign(secret: string, body: string): string {
    return createHmac('sha256', secret).update(body).digest('hex');
  }

  async create(userId: string, dto: CreateWebhookDto) {
    const secret = randomBytes(24).toString('hex');
    return this.prisma.webhook.create({
      data: {
        userId,
        url: dto.url,
        events: dto.events,
        secret,
        isActive: dto.isActive ?? true,
      },
    });
  }

  list(userId: string) {
    return this.prisma.webhook.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        url: true,
        events: true,
        isActive: true,
        lastTriggeredAt: true,
        failureCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async remove(userId: string, id: string) {
    const row = await this.prisma.webhook.findFirst({
      where: { id, userId },
    });
    if (!row) {
      throw new NotFoundException('errors.webhookNotFound');
    }
    await this.prisma.webhook.delete({ where: { id } });
    return { deleted: true };
  }

  async deliveries(userId: string, webhookId: string) {
    const wh = await this.prisma.webhook.findFirst({
      where: { id: webhookId, userId },
    });
    if (!wh) {
      throw new NotFoundException('errors.webhookNotFound');
    }
    return this.prisma.webhookDelivery.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async emit(userId: string, event: string, payload: Record<string, unknown>) {
    const webhooks = await this.prisma.webhook.findMany({
      where: {
        userId,
        isActive: true,
        events: { has: event },
      },
    });
    const body = JSON.stringify({
      event,
      payload,
      ts: new Date().toISOString(),
    });
    for (const wh of webhooks) {
      void this.deliverWithRetry(wh.id, wh.url, wh.secret, event, body);
    }
  }

  private async deliverWithRetry(
    webhookId: string,
    url: string,
    secret: string,
    event: string,
    body: string,
  ) {
    const signature = this.sign(secret, body);
    let lastStatus: number | null = null;
    let lastBody: string | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-PromptZero-Event': event,
            'X-PromptZero-Signature': `sha256=${signature}`,
          },
          body,
        });
        lastStatus = res.status;
        lastBody = await res.text().catch(() => '');
        if (res.ok) {
          await this.prisma.webhookDelivery.create({
            data: {
              webhookId,
              event,
              payload: JSON.parse(body) as object,
              statusCode: lastStatus,
              responseBody: lastBody?.slice(0, 2000) ?? null,
              attempts: attempt,
              deliveredAt: new Date(),
            },
          });
          await this.prisma.webhook.update({
            where: { id: webhookId },
            data: { lastTriggeredAt: new Date(), failureCount: 0 },
          });
          return;
        }
      } catch {
        lastStatus = 0;
        lastBody = 'network_error';
      }
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
    await this.prisma.webhookDelivery.create({
      data: {
        webhookId,
        event,
        payload: JSON.parse(body) as object,
        statusCode: lastStatus,
        responseBody: lastBody?.slice(0, 2000) ?? null,
        attempts: 3,
      },
    });
    await this.prisma.webhook.update({
      where: { id: webhookId },
      data: { failureCount: { increment: 1 } },
    });
  }
}
