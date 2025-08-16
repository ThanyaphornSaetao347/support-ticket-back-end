import { ForbiddenException, Injectable } from '@nestjs/common';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { UserAllowRole } from '../user_allow_role/entities/user_allow_role.entity';
import { Repository } from 'typeorm';
import { MasterRole } from '../master_role/entities/master_role.entity';

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(UserAllowRole)
    private readonly allowRoleRepo: Repository<UserAllowRole>,
    @InjectRepository(MasterRole)
    private readonly masterRepo: Repository<MasterRole>,
  ){}

  async get_permission_all() {
    try {
      const role = await this.masterRepo.find();
      return role;
    } catch (error) {
      console.error('Error fetching roles:', error);
      throw error
    }
  }

  async get_permission_byOne(user_id: number): Promise<number[]> {
    try {
      const role = await this.allowRoleRepo.find({
        where: { user_id },
        relations: ['role'],
      });
      return role.map(r => r.role.id);
    } catch (error) {
      console.error('Error fetching user roles:', error);
      throw error;
    }
  }

  /** ตรวจสอบ role ของ user */
  async checkRole(userId: number, requiredRoles: number[]): Promise<boolean> {
    const roles = await this.get_permission_byOne(userId);
    return requiredRoles.some(role => roles.includes(role));
  }

  /** ตรวจสอบ permission ของ user */
  async checkPermission(userId: number, requiredPermissions: number[]): Promise<boolean> {
    // ในกรณีนี้ ใช้ role_name แทน permission_name
    const userRoles = await this.get_permission_byOne(userId);
    return requiredPermissions.every(p => userRoles.includes(p));
  }

  /** ตรวจสอบว่า user มี permission หรือไม่ */
  async requirePermission(userId: number, requiredPermissions: number[]): Promise<void> {
    const hasPermission = await this.checkPermission(userId, requiredPermissions);
    
    if (!hasPermission) {
      throw new ForbiddenException(
        `Required permissions: ${requiredPermissions.join(', ')}`
      );
    }
  }

  /** ตรวจสอบว่า user มี role หรือไม่ */
  async requireRole(userId: number, requiredRoles: number[]): Promise<void> {
    const hasRole = await this.checkRole(userId, requiredRoles);
    
    if (!hasRole) {
      throw new ForbiddenException(
        `Required roles: ${requiredRoles.join(', ')}`
      );
    }
  }

  /** ดึง permissions ของ user ทั้งหมด (ใช้ role_name แทน) */
  async getUserPermissions(userId: number): Promise<string[]> {
    const userRoles = await this.allowRoleRepo.find({
      where: { user_id: userId },
      relations: ['role'],
    });

    if (!userRoles.length) return [];

    // สมมติว่า permission ใช้ role_name แทน
    const allPermissions = userRoles.map(ur => ur.role?.role_name).filter(Boolean);

    return [...new Set(allPermissions)];
  }

  /** ดึง roles ของ user ทั้งหมด */
  async getUserRoles(userId: number): Promise<string[]> {
    const userRoles = await this.allowRoleRepo.find({
      where: { user_id: userId },
      relations: ['role'],
    });

    return userRoles.map(ur => ur.role?.role_name).filter(Boolean);
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