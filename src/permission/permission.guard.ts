import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PermissionService } from "./permission.service";
import { permissionEnum } from "../permission";

@Injectable()
export class PermissionGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private permissionService: PermissionService,
    ){}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredPermissions = this.reflector.getAllAndOverride<permissionEnum[]>('permissions', [
        context.getHandler(),
        context.getClass(),
        ]);

        const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
        context.getHandler(),
        context.getClass(),
        ]);

        if (!requiredPermissions && !requiredRoles) {
        return true; // ไม่ต้องการ permission หรือ role
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user; // จาก JWT Guard

        if (!user) {
        return false;
        }

        // ตรวจสอบ permissions
        if (requiredPermissions) {
        const hasPermission = await this.permissionService.checkPermission(
            user.id,
            requiredPermissions
        );
        if (!hasPermission) {
            return false;
        }
        }

        // ตรวจสอบ roles
        if (requiredRoles) {
        const hasRole = await this.permissionService.checkRole(
            user.id,
            requiredRoles
        );
        if (!hasRole) {
            return false;
        }
        }

        return true;
    }
}