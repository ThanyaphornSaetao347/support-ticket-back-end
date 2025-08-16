import { SetMetadata } from "@nestjs/common";

export const requirePermissions = (...permissions: string[]) =>
    SetMetadata('permissions', permissions);

export const RequireRoles = (...roles: string[]) =>
    SetMetadata('roles', roles);