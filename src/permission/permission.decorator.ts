import { SetMetadata } from "@nestjs/common";
import { permissionEnum } from "src/permission";

export const requirePermissions = (...permissions: permissionEnum[]) =>
    SetMetadata('permissions', permissions);

export const RequireRoles = (...roles: string[]) =>
    SetMetadata('roles', roles);