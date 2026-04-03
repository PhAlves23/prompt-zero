import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { EvaluationService } from './evaluation.service';
import { CreateCriteriaDto } from './dto/create-criteria.dto';
import { JudgeExecutionDto } from './dto/judge-execution.dto';

@ApiTags('evaluation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'evaluation', version: '1' })
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  @Post('criteria')
  @ApiOperation({ summary: 'Create evaluation criteria' })
  createCriteria(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCriteriaDto,
  ) {
    return this.evaluationService.createCriteria(user.sub, dto);
  }

  @Get('criteria')
  @ApiOperation({ summary: 'List criteria' })
  listCriteria(@CurrentUser() user: AuthUser) {
    return this.evaluationService.listCriteria(user.sub);
  }

  @Post('judge')
  @ApiOperation({ summary: 'Run LLM-as-judge on an execution' })
  judge(@CurrentUser() user: AuthUser, @Body() dto: JudgeExecutionDto) {
    return this.evaluationService.judge(user.sub, dto);
  }

  @Get('executions/:executionId')
  @ApiOperation({ summary: 'List evaluations for execution' })
  listForExecution(
    @CurrentUser() user: AuthUser,
    @Param('executionId') executionId: string,
  ) {
    return this.evaluationService.listEvaluationsForExecution(
      user.sub,
      executionId,
    );
  }
}
