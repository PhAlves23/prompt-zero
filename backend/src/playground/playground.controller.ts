import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { PlaygroundService } from './playground.service';
import { ComparePromptDto } from './dto/compare-prompt.dto';

@ApiTags('playground')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'playground', version: '1' })
export class PlaygroundController {
  constructor(private readonly playgroundService: PlaygroundService) {}

  @Post('compare')
  @ApiOperation({
    summary: 'Execute same prompt against multiple model configs',
  })
  compare(@CurrentUser() user: AuthUser, @Body() dto: ComparePromptDto) {
    return this.playgroundService.compare(user.sub, dto);
  }
}
