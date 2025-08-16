import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionService } from '../permission/permission.service';

export interface PermissionConfig {
  roles?: number[];
  action?: string;
  allowOwner?: boolean;
}

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permissionConfig = this.reflector.getAllAndOverride<PermissionConfig>(
      'permission_config',
      [context.getHandler(), context.getClass()],
    );

    if (!permissionConfig) {
      return true; // ไม่มี permission requirement
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    const userId = user.id || user.sub || user.userId;

    // ตรวจสอบตาม action
    if (permissionConfig.action) {
      return this.checkActionPermission(userId, permissionConfig.action);
    }

    // ตรวจสอบตาม roles
    if (permissionConfig.roles) {
      const hasRole = await this.permissionService.hasAnyRole(userId, permissionConfig.roles);
      
      // ถ้าอนุญาตให้เจ้าของ resource เข้าถึงได้
      if (!hasRole && permissionConfig.allowOwner) {
        const resourceId = this.extractResourceId(request);
        if (resourceId) {
          // ต้องเพิ่ม logic เพื่อหา owner ของ resource
          return this.checkResourceOwnership(userId, resourceId, request);
        }
      }
      
      return hasRole;
    }

    return false;
  }

  private async checkActionPermission(userId: number, action: string): Promise<boolean> {
    const actionMap = {
      'create_user': () => this.permissionService.canCreateUser(userId),
      'read_user': () => this.permissionService.canReadUser(userId),
      'update_user': () => this.permissionService.canUpdateUser(userId),
      'delete_user': () => this.permissionService.canDeleteUser(userId),
      'create_ticket': () => this.permissionService.canCreateTicket(userId),
      'read_ticket': () => this.permissionService.canReadTicket(userId),
      'read_all_tickets': () => this.permissionService.canReadAllTickets(userId),
      'update_ticket': () => this.permissionService.canUpdateTicket(userId),
      'delete_ticket': () => this.permissionService.canDeleteTicket(userId),
      'restore_ticket': () => this.permissionService.canRestoreTicket(userId),
      'assign_ticket': () => this.permissionService.canAssignTicket(userId),
      'change_status': () => this.permissionService.canChangeStatus(userId),
      'solve_problem': () => this.permissionService.canSolveProblem(userId),
      'create_project': () => this.permissionService.canCreateProject(userId),
      'manage_category': () => this.permissionService.canManageCategory(userId),
      'manage_status': () => this.permissionService.canManageStatus(userId),
      'rate_satisfaction': () => this.permissionService.canRateSatisfaction(userId),
    };

    const permissionCheck = actionMap[action];
    return permissionCheck ? await permissionCheck() : false;
  }

  private extractResourceId(request: any): string | null {
    // ดึง resource ID จาก URL parameters
    return request.params.id || request.params.ticket_no || request.params.ticket_id || null;
  }

  private async checkResourceOwnership(userId: number, resourceId: string, request: any): Promise<boolean> {
    // Logic สำหรับตรวจสอบ ownership - ต้องปรับตาม business logic
    // ตัวอย่าง: ถ้าเป็น ticket route
    if (request.route.path.includes('ticket')) {
      // ต้องเพิ่ม service เพื่อเช็ค ticket ownership
      return false; // placeholder
    }
    
    return false;
  }
}