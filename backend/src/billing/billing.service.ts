import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import Stripe from 'stripe';
import { SubscriptionStatus, SubscriptionTier } from '@prisma/client';
import { CreateCheckoutDto, CheckoutTierDto } from './dto/create-checkout.dto';

type StripeCtor = typeof Stripe;
type StripeClient = StripeCtor extends new (
  key: string,
  ...args: unknown[]
) => infer R
  ? R
  : StripeCtor extends (
        this: unknown,
        key: string,
        ...args: unknown[]
      ) => infer R
    ? R
    : never;

const StripeConstructor = Stripe as unknown as new (
  key: string,
) => StripeClient;

/** Stripe webhook payload shapes (subset) */
type StripeSubscriptionPayload = {
  id: string;
  customer: string | { id: string };
  status: string;
  items: { data: Array<{ price?: { id?: string } | null }> };
  current_period_start?: number;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
};

type StripeInvoicePayload = {
  id: string;
  customer?: string | { id: string } | null;
  amount_due?: number;
  currency?: string;
  status?: string;
  hosted_invoice_url?: string | null;
};

const TIER_LIMITS: Record<SubscriptionTier, number> = {
  free: 50_000,
  pro: 250_000,
  team: 1_000_000,
  enterprise: 999_999_999,
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly stripe: StripeClient | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const key = this.configService.get<string>('STRIPE_SECRET_KEY');
    this.stripe = key ? new StripeConstructor(key) : null;
  }

  async ensureSubscription(userId: string) {
    const existing = await this.prisma.subscription.findUnique({
      where: { userId },
    });
    if (existing) {
      return existing;
    }
    return this.prisma.subscription.create({
      data: {
        userId,
        tier: SubscriptionTier.free,
        status: SubscriptionStatus.active,
        usageLimitExecutions: TIER_LIMITS.free,
      },
    });
  }

  async getUsage(userId: string) {
    const sub = await this.ensureSubscription(userId);
    const start = this.startOfCurrentMonth();
    const end = this.endOfCurrentMonth();
    const used = await this.prisma.execution.count({
      where: {
        userId,
        createdAt: { gte: start, lte: end },
      },
    });
    return {
      tier: sub.tier,
      status: sub.status,
      usageLimitExecutions: sub.usageLimitExecutions,
      executionsThisPeriod: used,
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      stripeCustomerId: sub.stripeCustomerId,
      hasActivePaid:
        sub.stripeSubscriptionId != null &&
        (sub.status === SubscriptionStatus.active ||
          sub.status === SubscriptionStatus.trialing),
    };
  }

  async assertWithinExecutionLimit(userId: string) {
    const { executionsThisPeriod, usageLimitExecutions } =
      await this.getUsage(userId);
    if (executionsThisPeriod >= usageLimitExecutions) {
      throw new HttpException(
        {
          message: 'errors.executionLimitExceeded',
          executionsThisPeriod,
          usageLimitExecutions,
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
  }

  async createCheckoutSession(userId: string, dto: CreateCheckoutDto) {
    if (!this.stripe) {
      throw new BadRequestException('errors.stripeNotConfigured');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('errors.userNotFound');
    }
    let sub = await this.ensureSubscription(userId);
    let customerId = sub.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: user.email,
        metadata: { userId },
      });
      customerId = customer.id;
      sub = await this.prisma.subscription.update({
        where: { userId },
        data: { stripeCustomerId: customerId },
      });
    }
    const priceId =
      dto.tier === CheckoutTierDto.pro
        ? this.configService.get<string>('STRIPE_PRICE_PRO')
        : this.configService.get<string>('STRIPE_PRICE_TEAM');
    if (!priceId) {
      throw new BadRequestException('errors.stripePriceNotConfigured');
    }
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const billingLocale = this.configService.get<string>(
      'BILLING_UI_LOCALE',
      'pt-BR',
    );
    const settingsBilling = `${frontendUrl.replace(/\/+$/, '')}/${billingLocale}/settings?tab=billing`;
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${settingsBilling}&checkout=success`,
      cancel_url: `${settingsBilling}&checkout=cancel`,
      metadata: { userId, tier: dto.tier },
    });
    return { url: session.url };
  }

  async createPortalSession(userId: string) {
    if (!this.stripe) {
      throw new BadRequestException('errors.stripeNotConfigured');
    }
    const sub = await this.ensureSubscription(userId);
    if (!sub.stripeCustomerId) {
      throw new BadRequestException('errors.noStripeCustomer');
    }
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const billingLocale = this.configService.get<string>(
      'BILLING_UI_LOCALE',
      'pt-BR',
    );
    const returnUrl = `${frontendUrl.replace(/\/+$/, '')}/${billingLocale}/settings?tab=billing`;
    const session = await this.stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: returnUrl,
    });
    return { url: session.url };
  }

  async handleStripeWebhook(signature: string | undefined, rawBody: Buffer) {
    if (!this.stripe) {
      throw new BadRequestException('errors.stripeNotConfigured');
    }
    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );
    if (!webhookSecret || !signature) {
      throw new BadRequestException('errors.stripeWebhookMisconfigured');
    }
    let event: { type: string; data: { object: Record<string, unknown> } };
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      ) as unknown as {
        type: string;
        data: { object: Record<string, unknown> };
      };
    } catch (err) {
      this.logger.warn(`Stripe webhook signature failed: ${err}`);
      throw new BadRequestException('errors.invalidStripeSignature');
    }

    switch (event.type) {
      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const sub = event.data.object as StripeSubscriptionPayload;
        await this.syncSubscriptionFromStripe(sub);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as StripeSubscriptionPayload;
        const row = await this.prisma.subscription.findFirst({
          where: { stripeSubscriptionId: sub.id },
        });
        if (row) {
          await this.prisma.subscription.update({
            where: { id: row.id },
            data: {
              status: SubscriptionStatus.canceled,
              stripeSubscriptionId: null,
              stripePriceId: null,
              tier: SubscriptionTier.free,
              usageLimitExecutions: TIER_LIMITS.free,
              currentPeriodStart: null,
              currentPeriodEnd: null,
            },
          });
        }
        break;
      }
      case 'invoice.paid':
      case 'invoice.payment_succeeded': {
        const inv = event.data.object as StripeInvoicePayload;
        const customerId =
          typeof inv.customer === 'string' ? inv.customer : inv.customer?.id;
        if (customerId && inv.id) {
          const subRow = await this.prisma.subscription.findFirst({
            where: { stripeCustomerId: customerId },
          });
          if (subRow) {
            await this.prisma.invoice.upsert({
              where: { stripeInvoiceId: inv.id },
              create: {
                userId: subRow.userId,
                stripeInvoiceId: inv.id,
                amountDue: inv.amount_due ?? 0,
                currency: inv.currency ?? 'usd',
                status: inv.status ?? 'paid',
                hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
              },
              update: {
                amountDue: inv.amount_due ?? 0,
                status: inv.status ?? 'paid',
                hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
              },
            });
          }
        }
        break;
      }
      default:
        this.logger.debug(`Unhandled Stripe event: ${event.type}`);
    }
    return { received: true };
  }

  private async syncSubscriptionFromStripe(sub: StripeSubscriptionPayload) {
    const customerId =
      typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
    const row = await this.prisma.subscription.findFirst({
      where: { stripeCustomerId: customerId },
    });
    if (!row) {
      this.logger.warn(`No local subscription for customer ${customerId}`);
      return;
    }
    const priceId = sub.items.data[0]?.price?.id ?? null;
    const tier = this.tierFromPriceId(priceId) ?? SubscriptionTier.pro;
    const statusMap: Record<string, SubscriptionStatus> = {
      active: SubscriptionStatus.active,
      trialing: SubscriptionStatus.trialing,
      past_due: SubscriptionStatus.past_due,
      canceled: SubscriptionStatus.canceled,
      unpaid: SubscriptionStatus.unpaid,
      incomplete: SubscriptionStatus.incomplete,
      incomplete_expired: SubscriptionStatus.incomplete_expired,
    };
    const status = statusMap[sub.status] ?? SubscriptionStatus.active;
    await this.prisma.subscription.update({
      where: { id: row.id },
      data: {
        stripeSubscriptionId: sub.id,
        stripePriceId: priceId,
        status,
        tier,
        usageLimitExecutions: TIER_LIMITS[tier],
        currentPeriodStart: sub.current_period_start
          ? new Date(sub.current_period_start * 1000)
          : null,
        currentPeriodEnd: sub.current_period_end
          ? new Date(sub.current_period_end * 1000)
          : null,
        cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
      },
    });
  }

  private tierFromPriceId(priceId: string | null): SubscriptionTier | null {
    if (!priceId) return null;
    const pro = this.configService.get<string>('STRIPE_PRICE_PRO');
    const team = this.configService.get<string>('STRIPE_PRICE_TEAM');
    if (priceId === pro) return SubscriptionTier.pro;
    if (priceId === team) return SubscriptionTier.team;
    return SubscriptionTier.pro;
  }

  private startOfCurrentMonth(): Date {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
  }

  private endOfCurrentMonth(): Date {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  }
}
