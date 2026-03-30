import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { I18nContext } from 'nestjs-i18n';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOperation({ summary: 'API health check' })
  @Get()
  getHealth() {
    const i18n = I18nContext.current();
    const key = 'responses.healthOk';
    const translated = i18n?.t(key);
    return {
      ...this.appService.getHealth(),
      message:
        typeof translated === 'string' && translated !== key
          ? translated
          : 'API is healthy',
    };
  }
}
