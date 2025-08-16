import { SetMetadata } from '@nestjs/common';

export const RequireRoles = (...roles: number[]) =>
  SetMetadata('permission_config', { roles });

export const RequireAction = (action: string) =>
  SetMetadata('permission_config', { action });

export const RequireRolesOrOwner = (...roles: number[]) =>
  SetMetadata('permission_config', { roles, allowOwner: true });
