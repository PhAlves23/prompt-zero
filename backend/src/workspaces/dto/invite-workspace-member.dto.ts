import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional } from 'class-validator';
import { WorkspaceRole } from '@prisma/client';

const inviteRoles = [
  WorkspaceRole.viewer,
  WorkspaceRole.editor,
  WorkspaceRole.admin,
] as const;

export class InviteWorkspaceMemberDto {
  @ApiProperty({ example: 'colleague@company.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ enum: inviteRoles, default: WorkspaceRole.viewer })
  @IsOptional()
  @IsIn(inviteRoles)
  role?: (typeof inviteRoles)[number];
}
