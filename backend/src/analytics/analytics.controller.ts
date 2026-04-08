import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import {
  AnalyticsQueryDto,
  CacheAnalyticsQueryDto,
  TopPromptsQueryDto,
} from './dto/analytics-query.dto';
import { CacheAnalyticsService } from './cache-analytics.service';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly cacheAnalyticsService: CacheAnalyticsService,
  ) {}

  @Get('overview')
  @ApiOperation({ summary: 'Summary metrics by period' })
  overview(@CurrentUser() user: AuthUser, @Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getOverview(user.sub, query.period);
  }

  @Get('executions-per-day')
  @ApiOperation({ summary: 'Execution count per day' })
  executionsPerDay(
    @CurrentUser() user: AuthUser,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getExecutionsPerDay(user.sub, query.period);
  }

  @Get('cost-per-model')
  @ApiOperation({ summary: 'Cost and tokens by model' })
  costPerModel(
    @CurrentUser() user: AuthUser,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getCostPerModel(user.sub, query.period);
  }

  @Get('top-prompts')
  @ApiOperation({ summary: 'Top prompts by execution count' })
  topPrompts(
    @CurrentUser() user: AuthUser,
    @Query() query: TopPromptsQueryDto,
  ) {
    return this.analyticsService.getTopPrompts(
      user.sub,
      query.period,
      query.limit,
    );
  }

  @Get('ab-history')
  @ApiOperation({ summary: 'A/B votes and experiments per day' })
  abHistory(@CurrentUser() user: AuthUser, @Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getAbHistory(user.sub, query.period);
  }

  @Get('ab-ranking')
  @ApiOperation({ summary: 'Top A/B experiments by votes' })
  abRanking(@CurrentUser() user: AuthUser, @Query() query: TopPromptsQueryDto) {
    return this.analyticsService.getAbRanking(
      user.sub,
      query.period,
      query.limit,
    );
  }

  @Get('cache-stats')
  @ApiOperation({ summary: 'Resumo de cache (hits, economia)' })
  cacheStats(
    @CurrentUser() user: AuthUser,
    @Query() query: CacheAnalyticsQueryDto,
  ) {
    return this.cacheAnalyticsService.getCacheStats(
      user.sub,
      query.workspaceId,
      query.period,
    );
  }

  @Get('cache-stats-per-day')
  @ApiOperation({ summary: 'Cache hit rate por dia' })
  cacheStatsPerDay(
    @CurrentUser() user: AuthUser,
    @Query() query: CacheAnalyticsQueryDto,
  ) {
    return this.cacheAnalyticsService.getCacheStatsPerDay(
      user.sub,
      query.workspaceId,
      query.period,
    );
  }
}
