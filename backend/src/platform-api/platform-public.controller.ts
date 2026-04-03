import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ApiKeyAuthGuard, API_KEY_USER_ID } from './api-key-auth.guard';
import { ExecutionsService } from '../executions/executions.service';
import { ExecutePromptDto } from '../executions/dto/execute-prompt.dto';
import { Throttle } from '@nestjs/throttler';

@ApiTags('platform-public')
@Controller({ path: 'public', version: '1' })
export class PlatformPublicController {
  constructor(private readonly executionsService: ExecutionsService) {}

  @Post('prompts/:id/execute')
  @UseGuards(ApiKeyAuthGuard)
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @ApiHeader({ name: 'X-PromptZero-Api-Key', required: true })
  @ApiOperation({ summary: 'Execute prompt using platform API key' })
  async execute(
    @Req() req: Request & { [API_KEY_USER_ID]?: string },
    @Param('id') promptId: string,
    @Body() dto: ExecutePromptDto,
  ) {
    const userId = req[API_KEY_USER_ID];
    if (!userId) {
      throw new Error('api key guard did not set user');
    }
    return this.executionsService.executePrompt(userId, promptId, dto);
  }
}
