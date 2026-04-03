import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { DatasetsService } from './datasets.service';
import { CreateDatasetDto } from './dto/create-dataset.dto';

@ApiTags('datasets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'datasets', version: '1' })
export class DatasetsController {
  constructor(private readonly datasetsService: DatasetsService) {}

  @Post()
  @ApiOperation({ summary: 'Create dataset with rows' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDatasetDto) {
    return this.datasetsService.create(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List datasets' })
  list(@CurrentUser() user: AuthUser) {
    return this.datasetsService.list(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get dataset with rows' })
  getOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.datasetsService.getOne(user.sub, id);
  }

  @Post(':id/run/:promptId')
  @ApiOperation({ summary: 'Run all dataset rows against a prompt' })
  run(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('promptId') promptId: string,
  ) {
    return this.datasetsService.run(user.sub, id, promptId);
  }

  @Get(':id/runs/:runId')
  @ApiOperation({ summary: 'Get dataset run results' })
  runResults(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('runId') runId: string,
  ) {
    return this.datasetsService.getRunResults(user.sub, id, runId);
  }
}
