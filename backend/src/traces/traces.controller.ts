import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { TracesService } from './traces.service';
import { IngestTraceDto } from './dto/ingest-trace.dto';

@ApiTags('traces')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'traces', version: '1' })
export class TracesController {
  constructor(private readonly tracesService: TracesService) {}

  @Post('ingest')
  @ApiOperation({ summary: 'Ingest LangChain-style trace spans' })
  ingest(@CurrentUser() user: AuthUser, @Body() dto: IngestTraceDto) {
    return this.tracesService.ingest(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List recent traces' })
  list(@CurrentUser() user: AuthUser) {
    return this.tracesService.list(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get trace with spans' })
  getOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tracesService.getOne(user.sub, id);
  }
}
