import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ExploreService } from './explore.service';
import { ListExploreQueryDto } from './dto/list-explore-query.dto';

@ApiTags('explore')
@Controller('explore')
export class ExploreController {
  constructor(private readonly exploreService: ExploreService) {}

  @Get()
  @ApiOperation({ summary: 'List public prompts for exploration' })
  list(@Query() query: ListExploreQueryDto) {
    return this.exploreService.listPublicPrompts(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get public prompt details' })
  getOne(@Param('id') id: string) {
    return this.exploreService.getPublicPrompt(id);
  }
}
