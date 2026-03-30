import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ExploreService } from './explore.service';
import { ListExploreQueryDto } from './dto/list-explore-query.dto';

@ApiTags('explore')
@Controller('explore')
export class ExploreController {
  constructor(private readonly exploreService: ExploreService) {}

  @Get()
  @ApiOperation({ summary: 'Listar prompts públicos para exploração' })
  list(@Query() query: ListExploreQueryDto) {
    return this.exploreService.listPublicPrompts(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de prompt público' })
  getOne(@Param('id') id: string) {
    return this.exploreService.getPublicPrompt(id);
  }
}
