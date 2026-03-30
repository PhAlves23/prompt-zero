import { Injectable } from '@nestjs/common';
import { ProviderType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProviderPricingService {
  constructor(private readonly prisma: PrismaService) {}

  async getPricing(
    provider: ProviderType,
    model: string,
  ): Promise<{
    input: number;
    output: number;
    source: 'dynamic' | 'fallback';
  }> {
    const now = new Date();
    const normalizedModel = model.trim();
    const pricing = await this.prisma.providerModelPricing.findFirst({
      where: {
        provider,
        model: normalizedModel,
        isActive: true,
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (pricing) {
      return {
        input: Number(pricing.inputCostPer1k),
        output: Number(pricing.outputCostPer1k),
        source: 'dynamic',
      };
    }

    if (provider === ProviderType.openrouter) {
      const defaultPricing = await this.prisma.providerModelPricing.findFirst({
        where: {
          provider,
          model: 'openrouter/default',
          isActive: true,
          effectiveFrom: { lte: now },
          OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
        },
        orderBy: { effectiveFrom: 'desc' },
      });

      if (defaultPricing) {
        return {
          input: Number(defaultPricing.inputCostPer1k),
          output: Number(defaultPricing.outputCostPer1k),
          source: 'dynamic',
        };
      }
    }

    return {
      ...this.getFallbackPricing(normalizedModel),
      source: 'fallback',
    };
  }

  private getFallbackPricing(model: string): { input: number; output: number } {
    const normalized = model.toLowerCase();

    if (normalized.includes('gpt-4o-mini')) {
      return { input: 0.00015, output: 0.0006 };
    }
    if (normalized.includes('gpt-4o')) {
      return { input: 0.005, output: 0.015 };
    }
    if (normalized.includes('claude-3-5-sonnet')) {
      return { input: 0.003, output: 0.015 };
    }
    if (normalized.includes('claude-3-haiku')) {
      return { input: 0.00025, output: 0.00125 };
    }
    if (normalized.includes('gemini-1.5-pro')) {
      return { input: 0.0035, output: 0.0105 };
    }
    if (normalized.includes('gemini-1.5-flash')) {
      return { input: 0.00035, output: 0.00105 };
    }
    if (normalized.startsWith('openrouter/')) {
      return { input: 0.001, output: 0.002 };
    }

    return { input: 0.001, output: 0.002 };
  }
}
