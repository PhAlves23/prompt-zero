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
  @ApiOperation({ summary: 'Criar prompt (gera versão v1 automaticamente)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePromptDto) {
    return this.promptsService.create(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar prompts do usuário' })
  findAll(@CurrentUser() user: AuthUser, @Query() query: ListPromptsQueryDto) {
    return this.promptsService.findAll(user.sub, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de um prompt' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.promptsService.findOne(user.sub, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar prompt (gera nova versão se content mudar)',
  })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePromptDto,
  ) {
    return this.promptsService.update(user.sub, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete de prompt' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.promptsService.remove(user.sub, id);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'Listar versões de um prompt' })
  listVersions(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.promptsService.listVersions(user.sub, id);
  }

  @Get(':id/versions/:versionId')
  @ApiOperation({ summary: 'Detalhe de uma versão' })
  @ApiParam({ name: 'versionId' })
  getVersion(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.promptsService.getVersion(user.sub, id, versionId);
  }

  @Post(':id/versions/:versionId/restore')
  @ApiOperation({ summary: 'Restaurar versão criando nova N+1' })
  restoreVersion(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.promptsService.restoreVersion(user.sub, id, versionId);
  }

  @Get(':id/variables')
  @ApiOperation({ summary: 'Listar variáveis de template de um prompt' })
  getTemplateVariables(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.promptsService.getTemplateVariables(user.sub, id);
  }

  @Put(':id/variables')
  @ApiOperation({ summary: 'Sincronizar variáveis de template de um prompt' })
  syncTemplateVariables(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SyncTemplateVariablesDto,
  ) {
    return this.promptsService.syncTemplateVariables(user.sub, id, dto);
  }

  @Post(':id/fork')
  @ApiOperation({ summary: 'Fazer fork de um prompt público' })
  forkPrompt(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.promptsService.forkPrompt(user.sub, id);
  }
}
