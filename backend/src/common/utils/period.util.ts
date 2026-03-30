import { BadRequestException } from '@nestjs/common';

export type AnalyticsPeriod = '7d' | '30d' | '90d';

export function getPeriodStartDate(period: AnalyticsPeriod): Date {
  const now = new Date();
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  return start;
}

export function parsePeriod(period: string | undefined): AnalyticsPeriod {
  if (!period) {
    return '30d';
  }
  if (period === '7d' || period === '30d' || period === '90d') {
    return period;
  }
  throw new BadRequestException('Período inválido. Use 7d, 30d ou 90d.');
}
