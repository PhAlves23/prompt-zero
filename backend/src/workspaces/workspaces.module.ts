import { Module } from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { WorkspacesController } from './workspaces.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkspaceAccessService } from './workspace-access.service';

@Module({
  imports: [PrismaModule],
  providers: [WorkspacesService, WorkspaceAccessService],
  controllers: [WorkspacesController],
  exports: [WorkspacesService, WorkspaceAccessService],
})
export class WorkspacesModule {}
