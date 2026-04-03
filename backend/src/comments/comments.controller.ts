import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@ApiTags('comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'comments', version: '1' })
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get('prompt/:promptId')
  @ApiOperation({ summary: 'List comments on prompt' })
  list(@CurrentUser() user: AuthUser, @Param('promptId') promptId: string) {
    return this.commentsService.list(user.sub, promptId);
  }

  @Post('prompt/:promptId')
  @ApiOperation({ summary: 'Create comment (supports @email mentions)' })
  create(
    @CurrentUser() user: AuthUser,
    @Param('promptId') promptId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.create(user.sub, promptId, dto);
  }
}
