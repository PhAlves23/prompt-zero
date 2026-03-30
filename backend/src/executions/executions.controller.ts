import {
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { ExecutePromptDto } from './dto/execute-prompt.dto';
import { ExecutionsService } from './executions.service';
import { ListExecutionsQueryDto } from './dto/list-executions-query.dto';
import { I18nContext } from 'nestjs-i18n';

@ApiTags('executions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('prompts')
export class ExecutionsController {
  constructor(private readonly executionsService: ExecutionsService) {}

  @Post(':id/execute')
  @ApiOperation({
    summary: 'Execute prompt with SSE streaming and persist execution',
  })
  @ApiProduces('text/event-stream')
  @ApiBody({ type: ExecutePromptDto })
  async execute(
    @CurrentUser() user: AuthUser,
    @Param('id') promptId: string,
    @Body() dto: ExecutePromptDto,
    @Res() response: Response,
  ) {
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');
    response.flushHeaders();

    try {
      this.writeSseEvent(response, 'start', { promptId, model: dto.model });

      const result = await this.executionsService.executePrompt(
        user.sub,
        promptId,
        dto,
      );

      const chunks = this.chunkText(result.output);
      for (const chunk of chunks) {
        this.writeSseEvent(response, 'chunk', { content: chunk });
      }

      this.writeSseEvent(response, 'done', {
        executionId: result.execution.id,
        meta: result.meta,
      });
    } catch (error) {
      const i18n = I18nContext.current();
      let message = this.translateMessage(i18n, 'responses.executionFailed');
      if (error instanceof HttpException) {
        message = this.translateMessage(i18n, this.extractErrorMessage(error));
      } else if (error instanceof Error) {
        message = this.translateMessage(i18n, error.message);
      }
      this.writeSseEvent(response, 'error', { message });
    } finally {
      response.end();
    }
  }

  @Get(':id/executions')
  @ApiOperation({ summary: 'List execution history for a prompt' })
  listExecutions(
    @CurrentUser() user: AuthUser,
    @Param('id') promptId: string,
    @Query() query: ListExecutionsQueryDto,
  ) {
    return this.executionsService.listPromptExecutions(
      user.sub,
      promptId,
      query,
    );
  }

  private writeSseEvent(
    response: Response,
    event: 'start' | 'chunk' | 'done' | 'error',
    payload: unknown,
  ) {
    response.write(`event: ${event}\n`);
    response.write(`data: ${JSON.stringify(payload)}\n\n`);
  }

  private extractErrorMessage(error: HttpException): string {
    const response = error.getResponse();
    if (typeof response === 'string') {
      return response;
    }

    if (response && typeof response === 'object' && 'message' in response) {
      const payloadMessage = response.message;
      if (Array.isArray(payloadMessage)) {
        return payloadMessage
          .filter((item): item is string => typeof item === 'string')
          .join(', ');
      }
      if (typeof payloadMessage === 'string') {
        return payloadMessage;
      }
    }

    return 'errors.internalServerError';
  }

  private translateMessage(
    i18n: I18nContext | undefined,
    message: string,
  ): string {
    if (!i18n || !message.includes('.')) {
      return message;
    }
    const translated = i18n.t(message);
    if (typeof translated === 'string' && translated !== message) {
      return translated;
    }
    return message;
  }

  private chunkText(text: string): string[] {
    if (!text) {
      return [''];
    }
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    let current = '';
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (next.length > 40) {
        chunks.push(current || word);
        current = current ? word : '';
      } else {
        current = next;
      }
    }
    if (current) {
      chunks.push(current);
    }
    return chunks;
  }
}
