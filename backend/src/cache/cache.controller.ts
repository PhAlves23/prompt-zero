import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { CacheService } from './cache.service';
import { UpdateCacheConfigDto } from './dto/update-cache-config.dto';
import { CacheStatsQueryDto } from './dto/cache-stats-query.dto';
import { CacheAnalyticsService } from '../analytics/cache-analytics.service';

@ApiTags('cache')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces/:workspaceId/cache')
export class CacheController {
  constructor(
    private readonly cacheService: CacheService,
    private readonly cacheAnalytics: CacheAnalyticsService,
  ) {}

  @Get('config')
  @ApiOperation({ summary: 'Obter configuração de cache do workspace' })
  getConfig(
    @CurrentUser() user: AuthUser,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.cacheService.getConfig(user.sub, workspaceId);
  }

  @Patch('config')
  @ApiOperation({ summary: 'Atualizar configuração de cache (admin+)' })
  updateConfig(
    @CurrentUser() user: AuthUser,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UpdateCacheConfigDto,
  ) {
    return this.cacheService.updateConfig(user.sub, workspaceId, dto);
  }

  @Delete()
  @ApiOperation({
    summary: 'Invalidar entradas de cache do workspace (admin+)',
  })
  invalidate(
    @CurrentUser() user: AuthUser,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.cacheService.invalidateForUser(user.sub, workspaceId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Métricas de cache do workspace' })
  async getStats(
    @CurrentUser() user: AuthUser,
    @Param('workspaceId') workspaceId: string,
    @Query() query: CacheStatsQueryDto,
  ) {
    await this.cacheService.assertWorkspaceAccess(
      user.sub,
      workspaceId,
      WorkspaceRole.viewer,
    );
    return this.cacheAnalytics.getCacheStats(
      user.sub,
      workspaceId,
      query.period,
    );
  }

  @Get('stats-per-day')
  @ApiOperation({ summary: 'Métricas de cache por dia (workspace)' })
  async getStatsPerDay(
    @CurrentUser() user: AuthUser,
    @Param('workspaceId') workspaceId: string,
    @Query() query: CacheStatsQueryDto,
  ) {
    await this.cacheService.assertWorkspaceAccess(
      user.sub,
      workspaceId,
      WorkspaceRole.viewer,
    );
    return this.cacheAnalytics.getCacheStatsPerDay(
      user.sub,
      workspaceId,
      query.period,
    );
  }
}
