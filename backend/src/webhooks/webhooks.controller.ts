import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { WebhooksService } from './webhooks.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';

@ApiTags('webhooks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'webhooks', version: '1' })
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  @ApiOperation({
    summary: 'Create webhook (secret returned once in response)',
  })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateWebhookDto) {
    return this.webhooksService.create(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List webhooks' })
  list(@CurrentUser() user: AuthUser) {
    return this.webhooksService.list(user.sub);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete webhook' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.webhooksService.remove(user.sub, id);
  }

  @Get(':id/deliveries')
  @ApiOperation({ summary: 'Recent deliveries' })
  deliveries(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.webhooksService.deliveries(user.sub, id);
  }
}
