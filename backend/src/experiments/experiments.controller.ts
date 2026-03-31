import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import type { RequestWithContext } from '../common/interfaces/request-context.interface';
import { CreateExperimentDto } from './dto/create-experiment.dto';
import { RunExperimentDto } from './dto/run-experiment.dto';
import { VoteExperimentDto } from './dto/vote-experiment.dto';
import { ExperimentsService } from './experiments.service';

@ApiTags('experiments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('experiments')
export class ExperimentsController {
  constructor(private readonly experimentsService: ExperimentsService) {}

  @Get()
  @ApiOperation({ summary: 'List user A/B experiments' })
  list(@CurrentUser() user: AuthUser) {
    return this.experimentsService.listExperiments(user.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Create prompt A/B experiment' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateExperimentDto) {
    return this.experimentsService.createExperiment(user.sub, dto);
  }

  @Post(':id/run')
  @ApiOperation({ summary: 'Run A/B experiment and create exposure' })
  run(
    @CurrentUser() user: AuthUser,
    @Param('id') experimentId: string,
    @Body() dto: RunExperimentDto,
    @Req() request: RequestWithContext,
  ) {
    return this.experimentsService.runExperiment(
      user.sub,
      experimentId,
      dto,
      request.requestId,
    );
  }

  @Post(':id/vote')
  @ApiOperation({ summary: 'Vote winning variant for an exposure' })
  vote(
    @CurrentUser() user: AuthUser,
    @Param('id') experimentId: string,
    @Body() dto: VoteExperimentDto,
  ) {
    return this.experimentsService.voteExperiment(user.sub, experimentId, dto);
  }

  @Get(':id/results')
  @ApiOperation({ summary: 'Get current A/B experiment results' })
  getResults(@CurrentUser() user: AuthUser, @Param('id') experimentId: string) {
    return this.experimentsService.getResults(user.sub, experimentId);
  }

  @Post(':id/stop')
  @ApiOperation({ summary: 'Stop running A/B experiment' })
  stop(@CurrentUser() user: AuthUser, @Param('id') experimentId: string) {
    return this.experimentsService.stopExperiment(user.sub, experimentId);
  }
}
