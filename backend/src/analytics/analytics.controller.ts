import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import {
  AnalyticsQueryDto,
  TopPromptsQueryDto,
} from './dto/analytics-query.dto';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

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
}
