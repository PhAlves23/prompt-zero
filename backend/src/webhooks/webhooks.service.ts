import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { TestWebhookDto } from './dto/test-webhook.dto';
import { createHmac, randomBytes } from 'crypto';
import { getSamplePayloadForEvent } from './webhook-sample-payloads';

type WebhookRow = Prisma.WebhookGetPayload<{
  select: {
    id: true;
    url: true;
    secret: true;
    retryCount: true;
    timeoutMs: true;
    filters: true;
  };
}>;

@Injectable()
export class WebhooksService {
  constructor(private readonly prisma: PrismaService) {}

  private sign(secret: string, body: string): string {
    return createHmac('sha256', secret).update(body).digest('hex');
  }

  private clampRetryCount(n: number): number {
    return Math.min(10, Math.max(1, n));
  }

  private clampTimeoutMs(n: number): number {
    return Math.min(120_000, Math.max(1_000, n));
  }

  private matchesFilters(
    filters: unknown,
    payload: Record<string, unknown>,
  ): boolean {
    if (
      filters == null ||
      typeof filters !== 'object' ||
      Array.isArray(filters)
    ) {
      return true;
    }
    const f = filters as Record<string, unknown>;
    const asComparable = (v: unknown): string => {
      if (v === null || v === undefined) {
        return '';
      }
      if (
        typeof v === 'string' ||
        typeof v === 'number' ||
        typeof v === 'boolean'
      ) {
        return JSON.stringify(v);
      }
      try {
        return JSON.stringify(v);
      } catch {
        return '';
      }
    };
    return Object.entries(f).every(([key, value]) => {
      if (value === undefined || value === '') {
        return true;
      }
      const p = payload[key];
      return p === value || asComparable(p) === asComparable(value);
    });
  }

  async create(userId: string, dto: CreateWebhookDto) {
    const secret = randomBytes(24).toString('hex');
    const createData: Prisma.WebhookCreateInput = {
      user: { connect: { id: userId } },
      name: dto.name ?? null,
      url: dto.url,
      events: dto.events,
      secret,
      isActive: dto.isActive ?? true,
      retryCount: this.clampRetryCount(dto.retryCount ?? 3),
      timeoutMs: this.clampTimeoutMs(dto.timeoutMs ?? 60_000),
    };
    if (dto.filters !== undefined) {
      createData.filters = dto.filters as Prisma.InputJsonValue;
    }
    const row = await this.prisma.webhook.create({
      data: createData,
    });
    void this.emit(userId, 'webhook_endpoint.created', {
      webhookId: row.id,
      url: row.url,
      events: row.events,
    });
    return row;
  }

  async update(userId: string, id: string, dto: UpdateWebhookDto) {
    const row = await this.prisma.webhook.findFirst({
      where: { id, userId },
    });
    if (!row) {
      throw new NotFoundException('errors.webhookNotFound');
    }
    const data: Prisma.WebhookUpdateInput = {};
    if (dto.name !== undefined) {
      data.name = dto.name;
    }
    if (dto.url !== undefined) {
      data.url = dto.url;
    }
    if (dto.events !== undefined) {
      data.events = dto.events;
    }
    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }
    if (dto.filters !== undefined) {
      data.filters =
        dto.filters === null
          ? Prisma.DbNull
          : (dto.filters as Prisma.InputJsonValue);
    }
    if (dto.retryCount !== undefined) {
      data.retryCount = this.clampRetryCount(dto.retryCount);
    }
    if (dto.timeoutMs !== undefined) {
      data.timeoutMs = this.clampTimeoutMs(dto.timeoutMs);
    }
    return this.prisma.webhook.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        url: true,
        events: true,
        isActive: true,
        filters: true,
        retryCount: true,
        timeoutMs: true,
        lastTriggeredAt: true,
        failureCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  list(userId: string) {
    return this.prisma.webhook.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        url: true,
        events: true,
        isActive: true,
        filters: true,
        retryCount: true,
        timeoutMs: true,
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
    void this.emit(userId, 'webhook_endpoint.deleted', {
      webhookId: id,
    });
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

  async testWebhook(userId: string, webhookId: string, dto: TestWebhookDto) {
    const wh = await this.prisma.webhook.findFirst({
      where: { id: webhookId, userId },
    });
    if (!wh) {
      throw new NotFoundException('errors.webhookNotFound');
    }
    const payload = dto.payload ?? getSamplePayloadForEvent(dto.event);
    const body = JSON.stringify({
      event: dto.event,
      payload,
      ts: new Date().toISOString(),
    });
    const signature = this.sign(wh.secret, body);
    const timeoutMs = this.clampTimeoutMs(wh.timeoutMs);
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-PromptZero-Event': dto.event,
      'X-PromptZero-Signature': `sha256=${signature}`,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(wh.url, {
        method: 'POST',
        headers: requestHeaders,
        body,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const text = await res.text().catch(() => '');
      return {
        ok: res.ok,
        statusCode: res.status,
        responseBody: text.slice(0, 4000),
        requestBody: body,
        headersSent: requestHeaders,
      };
    } catch (e) {
      clearTimeout(timeoutId);
      const message = e instanceof Error ? e.message : 'unknown_error';
      return {
        ok: false,
        statusCode: 0,
        responseBody: null as string | null,
        errorMessage: message,
        requestBody: body,
        headersSent: requestHeaders,
      };
    }
  }

  async emit(userId: string, event: string, payload: Record<string, unknown>) {
    const webhooks = await this.prisma.webhook.findMany({
      where: {
        userId,
        isActive: true,
        events: { has: event },
      },
      select: {
        id: true,
        url: true,
        secret: true,
        retryCount: true,
        timeoutMs: true,
        filters: true,
      },
    });
    const body = JSON.stringify({
      event,
      payload,
      ts: new Date().toISOString(),
    });
    for (const wh of webhooks) {
      if (!this.matchesFilters(wh.filters, payload)) {
        continue;
      }
      void this.deliverWithRetry(wh, event, body);
    }
  }

  private async deliverWithRetry(wh: WebhookRow, event: string, body: string) {
    const signature = this.sign(wh.secret, body);
    const maxAttempts = this.clampRetryCount(wh.retryCount);
    const timeoutMs = this.clampTimeoutMs(wh.timeoutMs);
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-PromptZero-Event': event,
      'X-PromptZero-Signature': `sha256=${signature}`,
    };

    let lastStatus: number | null = null;
    let lastBody: string | null = null;
    let lastError: string | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(wh.url, {
          method: 'POST',
          headers: requestHeaders,
          body,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        lastStatus = res.status;
        lastBody = await res.text().catch(() => '');
        if (res.ok) {
          await this.prisma.webhookDelivery.create({
            data: {
              webhookId: wh.id,
              event,
              payload: JSON.parse(body) as object,
              statusCode: lastStatus,
              responseBody: lastBody?.slice(0, 2000) ?? null,
              requestHeaders: requestHeaders as object,
              errorMessage: null,
              attempts: attempt,
              deliveredAt: new Date(),
            },
          });
          await this.prisma.webhook.update({
            where: { id: wh.id },
            data: { lastTriggeredAt: new Date(), failureCount: 0 },
          });
          return;
        }
        lastError = `HTTP ${lastStatus}`;
      } catch (e) {
        clearTimeout(timeoutId);
        lastStatus = 0;
        lastBody =
          e instanceof Error && e.name === 'AbortError'
            ? 'timeout'
            : 'network_error';
        lastError = e instanceof Error ? e.message : 'network_error';
      }
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 500 * attempt));
      }
    }

    await this.prisma.webhookDelivery.create({
      data: {
        webhookId: wh.id,
        event,
        payload: JSON.parse(body) as object,
        statusCode: lastStatus,
        responseBody: lastBody?.slice(0, 2000) ?? null,
        requestHeaders: requestHeaders as object,
        errorMessage: lastError,
        attempts: maxAttempts,
      },
    });
    await this.prisma.webhook.update({
      where: { id: wh.id },
      data: { failureCount: { increment: 1 } },
    });
  }
}
