import { ForbiddenException, Injectable } from '@nestjs/common';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { UserAllowRole } from '../user_allow_role/entities/user_allow_role.entity';
import { In, Repository } from 'typeorm';
import { MasterRole } from '../master_role/entities/master_role.entity';
import { permissionEnum } from '../permission';

const ROLE_PERMISSIONS = {
  'admin': [
    permissionEnum.ADD_USER,
    permissionEnum.ASSIGNEE,
    permissionEnum.CHANGE_STATUS,
    permissionEnum.CLOSE_TICKET,
    permissionEnum.DEL_USER,
    permissionEnum.OPEN_TICKET,
    permissionEnum.REPLY_TICKET,
    permissionEnum.TRACK_TICKET,
    permissionEnum.VIEW_ALL_TICKETS,
    permissionEnum.SOLVE_PROBLEM
  ],
  'supporter': [
    permissionEnum.CHANGE_STATUS,
    permissionEnum.CLOSE_TICKET,
    permissionEnum.OPEN_TICKET,
    permissionEnum.REPLY_TICKET,
    permissionEnum.VIEW_ALL_TICKETS,
    permissionEnum.SOLVE_PROBLEM,
    permissionEnum.ASSIGNEE
  ],
  'user': [
    permissionEnum.CREATE_TICKET,
    permissionEnum.DELETE_TICKET,
    permissionEnum.EDIT_TICKET,
    permissionEnum.RESTORE_TICKET,
    permissionEnum.SATISFACTION,
    permissionEnum.TRACK_TICKET,
    permissionEnum.VIEW_OWN_TICKETS
  ]
}

export const ROLES = {
  ADMIN: 'admin',
  SUPPORTER: 'supporter',
  USER: 'user',
} as const;

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(UserAllowRole)
    private readonly allowRoleRepo: Repository<UserAllowRole>,
    @InjectRepository(MasterRole)
    private readonly masterRepo: Repository<MasterRole>,
  ){}

  async checkPermission(userId: number, requiredPermissions: permissionEnum[]): Promise<boolean> {
    // ดึง roles ของ user
    const userRoles = await this.allowRoleRepo.find({
      where: { user_id: userId },
      relations: ['role'],
    });

    if (!userRoles.length) {
      return false;
    }

    // รวม permissions จาก role_name
    const userPermissions = userRoles.reduce((permissions, userRole) => {
      const roleName = userRole.role?.role_name?.toLowerCase();
      if (roleName && ROLE_PERMISSIONS[roleName]) {
        return [...permissions, ...ROLE_PERMISSIONS[roleName]];
      }
      return permissions;
    }, []);

    // ลบ permission ที่ซ้ำ
    const uniquePermissions = [...new Set(userPermissions)];

    // ตรวจสอบว่ามี permission ที่ต้องการหรือไม่
    return requiredPermissions.every(permission => 
      uniquePermissions.includes(permission)
    );
  }

  async checkRole(userId: number, requiredRoles: string[]): Promise<boolean> {
    const userRoles = await this.allowRoleRepo.find({
      where: { user_id: userId },
      relations: ['role'],
    });

    const userRoleNames = userRoles
      .map(ur => ur.role?.role_name?.toLowerCase())
      .filter(Boolean);
    
    return requiredRoles.some(role => 
      userRoleNames.includes(role.toLowerCase())
    );
  }

  async requirePermission(userId: number, requiredPermissions: permissionEnum[]): Promise<void> {
    const hasPermission = await this.checkPermission(userId, requiredPermissions);
    
    if (!hasPermission) {
      const permissionNames = requiredPermissions.map(p => permissionEnum[p]).join(', ');
      throw new ForbiddenException(
        `Required permissions: ${permissionNames}`
      );
    }
  }

  async requireRole(userId: number, requiredRoles: string[]): Promise<void> {
    const hasRole = await this.checkRole(userId, requiredRoles);
    
    if (!hasRole) {
      throw new ForbiddenException(
        `Required roles: ${requiredRoles.join(', ')}`
      );
    }
  }

  async getUserPermissions(userId: number): Promise<permissionEnum[]> {
    const userRoles = await this.allowRoleRepo.find({
      where: { user_id: userId },
      relations: ['role'],
    });

    if (!userRoles.length) {
      return [];
    }

    const allPermissions = userRoles.reduce((permissions, userRole) => {
      const roleName = userRole.role?.role_name?.toLowerCase();
      if (roleName && ROLE_PERMISSIONS[roleName]) {
        return [...permissions, ...ROLE_PERMISSIONS[roleName]];
      }
      return permissions;
    }, []);

    return [...new Set(allPermissions)];
  }

  async getUserRoles(userId: number): Promise<string[]> {
    const userRoles = await this.allowRoleRepo.find({
      where: { user_id: userId },
      relations: ['role'],
    });

    return userRoles
      .map(ur => ur.role?.role_name)
      .filter(Boolean);
  }

  create(createPermissionDto: CreatePermissionDto) {
    return 'This action adds a new permission';
  }

  findAll() {
    return `This action returns all permission`;
  }

  findOne(id: number) {
    return `This action returns a #${id} permission`;
  }

  update(id: number, updatePermissionDto: UpdatePermissionDto) {
    return `This action updates a #${id} permission`;
  }

  remove(id: number) {
    return `This action removes a #${id} permission`;
  }
}