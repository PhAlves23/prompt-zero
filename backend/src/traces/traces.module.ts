import { Module } from '@nestjs/common';
import { TracesService } from './traces.service';
import { TracesController } from './traces.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TracesController],
  providers: [TracesService],
  exports: [TracesService],
})
export class TracesModule {}
