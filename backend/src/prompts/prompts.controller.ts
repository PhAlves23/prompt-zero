import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { PromptsService } from './prompts.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { CreatePromptDto } from './dto/create-prompt.dto';
import { UpdatePromptDto } from './dto/update-prompt.dto';
import { ListPromptsQueryDto } from './dto/list-prompts-query.dto';
import { SyncTemplateVariablesDto } from './dto/sync-template-variables.dto';

@ApiTags('prompts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('prompts')
export class PromptsController {
  constructor(private readonly promptsService: PromptsService) {}

  @Post()
  @ApiOperation({ summary: 'Create prompt (automatically creates v1)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePromptDto) {
    return this.promptsService.create(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List user prompts' })
  findAll(@CurrentUser() user: AuthUser, @Query() query: ListPromptsQueryDto) {
    return this.promptsService.findAll(user.sub, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get prompt details' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.promptsService.findOne(user.sub, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update prompt (creates new version when content changes)',
  })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePromptDto,
  ) {
    return this.promptsService.update(user.sub, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete prompt' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.promptsService.remove(user.sub, id);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'List prompt versions' })
  listVersions(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.promptsService.listVersions(user.sub, id);
  }

  @Get(':id/versions/:versionId')
  @ApiOperation({ summary: 'Get version details' })
  @ApiParam({ name: 'versionId' })
  getVersion(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.promptsService.getVersion(user.sub, id, versionId);
  }

  @Post(':id/versions/:versionId/restore')
  @ApiOperation({ summary: 'Restore version by creating new N+1 version' })
  restoreVersion(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.promptsService.restoreVersion(user.sub, id, versionId);
  }

  @Get(':id/variables')
  @ApiOperation({ summary: 'List prompt template variables' })
  getTemplateVariables(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.promptsService.getTemplateVariables(user.sub, id);
  }

  @Put(':id/variables')
  @ApiOperation({ summary: 'Sync prompt template variables' })
  syncTemplateVariables(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SyncTemplateVariablesDto,
  ) {
    return this.promptsService.syncTemplateVariables(user.sub, id, dto);
  }

  @Post(':id/fork')
  @ApiOperation({ summary: 'Fork a public prompt' })
  forkPrompt(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.promptsService.forkPrompt(user.sub, id);
  }
}
