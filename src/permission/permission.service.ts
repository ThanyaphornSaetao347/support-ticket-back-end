import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UserAllowRole } from '../user_allow_role/entities/user_allow_role.entity';
import { MasterRole } from '../master_role/entities/master_role.entity';
import { Users } from '../users/entities/user.entity';

export interface UserPermissionInfo {
  userId: number;
  username: string;
  roles: Array<{ roleId: number; roleName: string }>;
  permissions: Array<{ permissionId: number; permissionName: string }>;
}

@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);
  private permissionCache = new Map<number, UserPermissionInfo>();
  private readonly CACHE_TTL = 5 * 60 * 1000;
  private cacheTimestamps = new Map<number, number>();

  constructor(
    @InjectRepository(UserAllowRole)
    private readonly userAllowRoleRepo: Repository<UserAllowRole>,
    @InjectRepository(MasterRole)
    private readonly masterRoleRepo: Repository<MasterRole>,
    @InjectRepository(Users)
    private readonly usersRepo: Repository<Users>,
    private readonly dataSource: DataSource,
  ) {}

  // ดึงข้อมูล user + roles
  async getUserPermissionInfo(userId: number): Promise<UserPermissionInfo | null> {
    if (this.isCacheValid(userId)) return this.permissionCache.get(userId) || null;

    try {
      const results = await this.dataSource.query(
        `
        SELECT u.id as user_id, u.username, mr.id as role_id, mr.role_name
        FROM users u
        LEFT JOIN users_allow_role uar ON u.id = uar.user_id
        LEFT JOIN master_role mr ON uar.role_id = mr.id
        WHERE u.id = $1 AND u.isenabled = true
        `,
        [userId],
      );

      if (results.length === 0) return null;

      const roles = results.filter(r => r.role_id !== null).map(r => ({
        roleId: Number(r.role_id),
        roleName: r.role_name,
      }));

      const permissions = roles.map(r => ({ permissionId: r.roleId, permissionName: r.roleName }));

      const userInfo: UserPermissionInfo = {
        userId: results[0].user_id,
        username: results[0].username,
        roles,
        permissions,
      };

      this.permissionCache.set(userId, userInfo);
      this.cacheTimestamps.set(userId, Date.now());

      return userInfo;
    } catch (err) {
      this.logger.error(`Error getting user permission info for user ${userId}:`, err);
      return null;
    }
  }

  // ตรวจสอบ role
  async hasRole(userId: number, roleId: number, userPermissions: number[]): Promise<boolean> {
    return userPermissions.includes(roleId);
  }

  async hasAnyRole(userId: number, requiredRoles: number[], userPermissions: number[]): Promise<boolean> {
    return requiredRoles.some(role => userPermissions.includes(role));
}

  async hasAllRoles(userId: number, roleIds: number[], userPermissions: number[]): Promise<boolean> {
    return roleIds.every(rid => userPermissions.includes(rid));
  }

  async getUserRoleIds(userId: number): Promise<number[]> {
    const userInfo = await this.getUserPermissionInfo(userId);
    return userInfo ? userInfo.roles.map(r => r.roleId) : [];
  }

  async getUserRoleNames(userId: number): Promise<string[]> {
    const userInfo = await this.getUserPermissionInfo(userId);
    return userInfo ? userInfo.roles.map(r => r.roleName) : [];
  }

  // ------------------- ฟังก์ชัน canXxx -------------------
  async canCreateUser(userId: number, userPermissions: number[]): Promise<boolean> {
    return this.hasRole(userId, 15, userPermissions);
  }
  async canReadUser(userId: number, userPermissions: number[]): Promise<boolean> {
    return this.hasRole(userId, 15, userPermissions);
  }
  async canUpdateUser(userId: number, userPermissions: number[]): Promise<boolean> {
    return this.hasRole(userId, 15, userPermissions);
  }
  async canDeleteUser(userId: number, userPermissions: number[]): Promise<boolean> {
    return this.hasRole(userId, 16, userPermissions);
  }

<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> fef258e11fb85526f63cfa733c58125e62453040
>>>>>>> cea3524b1f3c03397e21b1d2703b94b86d58787a
  async canCreateCustomer(userId: number, userPermissions: number[]): Promise<boolean> {
    return this.hasRole(userId, 20, userPermissions);
  }

<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
=======
>>>>>>> 44b5f76e0a11799c862a981775c1a3a71ac974a4
>>>>>>> fef258e11fb85526f63cfa733c58125e62453040
>>>>>>> cea3524b1f3c03397e21b1d2703b94b86d58787a
  async canCreateTicket(userId: number, userPermissions: number[]): Promise<boolean> {
    return this.hasRole(userId, 1, userPermissions);
  }
  async canReadTicketDetial(userId: number, userPermissions: number[]): Promise<boolean> {
    return this.hasRole(userId, 12, userPermissions);
  }
  async canReadAllTickets(userId: number, userPermissions: number[]): Promise<boolean> {
    return this.hasRole(userId, 13, userPermissions);
  }
  async canUpdateTicket(userId: number, userPermissions: number[]): Promise<boolean> {
    return this.hasAnyRole(userId, [3, 19], userPermissions);
  }
  async canDeleteTicket(userId: number, userPermissions: number[]): Promise<boolean> {
    return this.hasAnyRole(userId, [4, 19], userPermissions);
  }
  async canRestoreTicket(userId: number, userPermissions: number[]): Promise<boolean> {
    return this.hasAnyRole(userId, [11, 19], userPermissions);
  }
  async canViewDeletedTickets(userId: number, userPermissions: number[]): Promise<boolean> {
    return this.hasAnyRole(userId, [11, 19], userPermissions);
  }
  async canGetAllMasterFillter(userId: number, userPermissions: number[]): Promise<boolean> {
    return this.hasAnyRole(userId, [1, 13], userPermissions);
  }

  async canAssignTicket(userId: number, userPermissions: number[]): Promise<boolean> {
    return this.hasAnyRole(userId, [19], userPermissions);
  }
  
  async canGetAssign(userId: number, userPermissions: number[]): Promise<boolean> {
    return this.hasRole(userId, 9, userPermissions);
  }
  async canChangeStatus(userId: number, userPermissions: number[]): Promise<boolean> {
    return this.hasAnyRole(userId, [5, 13], userPermissions);
  }
  async canSolveProblem(userId: number, userPermissions: number[]): Promise<boolean> {
    return this.hasAnyRole(userId, [8, 13], userPermissions);
  }

  async canCreateProject(userId: number, userPermissions: number[]): Promise<boolean> {
    return this.hasAnyRole(userId, [10], userPermissions);
  }
  
  async canReadProject(userId: number, userPermissions: number[]): Promise<boolean> {
    return this.hasAnyRole(userId, [1], userPermissions);
  }
  async canReadAllProject(userId: number, userPermissions: number[]): Promise<boolean> {
    return this.hasAnyRole(userId, [13], userPermissions);
  }
  async canUpdateProject(userId: number, userPermissions: number[]): Promise<boolean> {
    return this.hasAnyRole(userId, [10, 13], userPermissions);
  }
  async canDeleteProject(userId: number, userPermissions: number[]): Promise<boolean> {
    return this.hasAnyRole(userId, [10, 13], userPermissions);
  }

  async canManageCategory(userId: number, userPermissions: number[]): Promise<boolean> {
    return this.hasAnyRole(userId, [17, 13], userPermissions);
  }
  async canManageStatus(userId: number, userPermissions: number[]): Promise<boolean> {
    return this.hasAnyRole(userId, [18, 13], userPermissions);
  }
  async canRateSatisfaction(userId: number, userPermissions: number[]): Promise<boolean> {
    return this.hasRole(userId, 14, userPermissions);
  }

<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
  async canDeleteUser(userId: number): Promise<boolean> {
    return this.hasRole(userId, 16); // ADMIN = 13, USER_MANAGER = 15
  }

  // Ticket Management Permissions
  async canCreateTicket(userId: number): Promise<boolean> {
    return this.hasRole(userId, 1); // REPORTER = 1
  }

  async canReadTicketDetial(userId: number): Promise<boolean> {
    return this.hasRole(userId, 12); // REPORTER, TRACKER, TICKET_OWNER, ADMIN
  }

  async canReadAllTickets(userId: number): Promise<boolean> {
    return this.hasRole(userId, 13); // TRACKER = 2, ADMIN = 13
  }

  async canUpdateTicket(userId: number): Promise<boolean> {
    return this.hasAnyRole(userId, [3,19]); // EDITOR = 3, PROBLEM_SOLVER = 8, ADMIN = 13
  }

  async canDeleteTicket(userId: number): Promise<boolean> {
    return this.hasAnyRole(userId, [4, 19]); // DELETER = 4, ADMIN = 13
  }

  async canRestoreTicket(userId: number): Promise<boolean> {
    return this.hasAnyRole(userId, [11, 19]); // RESTORER = 11, ADMIN = 13
  }

  async canViewDeletedTickets(userId: number): Promise<boolean> {
    return this.hasAnyRole(userId, [11, 19]); // RESTORER = 11, ADMIN = 13
  }

  async canGetAllMasterFillter(userId: number): Promise<boolean> {
    return this.hasAnyRole(userId, [1, 13])
  }

  // Ticket Operations
  async canAssignTicket(userId: number): Promise<boolean> {
    return this.hasAnyRole(userId, [19]); // ASSIGNOR = 19
  }

  async canGetAssign(userId: number): Promise<boolean> {
    return this.hasRole(userId, 9)
  }

  async canChangeStatus(userId: number): Promise<boolean> {
    return this.hasAnyRole(userId, [5, 13]); // STATUS_CHANGER = 5, ADMIN = 13
  }

  async canSolveProblem(userId: number): Promise<boolean> {
    return this.hasAnyRole(userId, [8, 13]); // PROBLEM_SOLVER = 8, ADMIN = 13
  }

  // Project Management
  async canCreateProject(userId: number): Promise<boolean> {
    return this.hasAnyRole(userId, [10, 13]); // PROJECT_MANAGER = 10, ADMIN = 13
  }

  async canReadProject(userId: number): Promise<boolean> {
    return this.hasAnyRole(userId, [1]); // 1
  }

  async canReadAllProject(userId: number): Promise<boolean> {
    return this.hasAnyRole(userId, [13])
  }

  async canUpdateProject(userId: number): Promise<boolean> {
    return this.hasAnyRole(userId, [10, 13]); // PROJECT_MANAGER = 10, ADMIN = 13
  }

  async canDeleteProject(userId: number): Promise<boolean> {
    return this.hasAnyRole(userId, [10, 13]); // PROJECT_MANAGER = 10, ADMIN = 13
  }

  // Category Management
  async canManageCategory(userId: number): Promise<boolean> {
    return this.hasAnyRole(userId, [17, 13]); // CATEGORY_MANAGER = 17, ADMIN = 13
  }

  // Status Management
  async canManageStatus(userId: number): Promise<boolean> {
    return this.hasAnyRole(userId, [18, 13]); // STATUS_MANAGER = 18, ADMIN = 13
  }

  // Satisfaction
  async canRateSatisfaction(userId: number): Promise<boolean> {
    return this.hasRole(userId, 14); // RATER = 14
  }

  /**
   * ตรวจสอบว่าเป็นเจ้าของ resource หรือไม่
   */
>>>>>>> c800e6ccbbccb4c37b12cb33ae2e84d31ad3f529
>>>>>>> 44b5f76e0a11799c862a981775c1a3a71ac974a4
  async isResourceOwner(userId: number, resourceCreatorId: number): Promise<boolean> {
    return userId === resourceCreatorId;
  }

  async canAccessResource(
    userId: number,
    resourceCreatorId: number,
    requiredRoles: number[],
    userPermissions: number[],
  ): Promise<boolean> {
    if (await this.isResourceOwner(userId, resourceCreatorId)) return true;
    return this.hasAnyRole(userId, requiredRoles, userPermissions);
  }

  // ------------------- Cache -------------------
  private isCacheValid(userId: number): boolean {
    const timestamp = this.cacheTimestamps.get(userId);
    return timestamp ? Date.now() - timestamp < this.CACHE_TTL : false;
  }

  clearUserCache(userId: number): void {
    this.permissionCache.delete(userId);
    this.cacheTimestamps.delete(userId);
  }
  clearAllCache(): void {
    this.permissionCache.clear();
    this.cacheTimestamps.clear();
  }

  // ------------------- Debug -------------------
  async debugUserPermissions(userId: number, userPermissions: number[]): Promise<any> {
    return {
      userId,
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 44b5f76e0a11799c862a981775c1a3a71ac974a4
      userPermissions,
      canCreateUser: await this.canCreateUser(userId, userPermissions),
      canReadUser: await this.canReadUser(userId, userPermissions),
      canCreateTicket: await this.canCreateTicket(userId, userPermissions),
      canReadAllTickets: await this.canReadAllTickets(userId, userPermissions),
      canUpdateTicket: await this.canUpdateTicket(userId, userPermissions),
      canDeleteTicket: await this.canDeleteTicket(userId, userPermissions),
      canAssignTicket: await this.canAssignTicket(userId, userPermissions),
      canGetAssign: await this.canGetAssign(userId, userPermissions),
      canChangeStatus: await this.canChangeStatus(userId, userPermissions),
<<<<<<< HEAD
=======
=======
      userInfo,
      permissions: {
        canCreateUser: await this.canCreateUser(userId),
        canReadUser: await this.canReadUser(userId),
        canCreateTicket: await this.canCreateTicket(userId),
        canReadAllTickets: await this.canReadAllTickets(userId),
        canUpdateTicket: await this.canUpdateTicket(userId),
        canDeleteTicket: await this.canDeleteTicket(userId),
        canAssignTicket: await this.canAssignTicket(userId),
        canGetAssign: await this.canGetAssign(userId),
        canChangeStatus: await this.canChangeStatus(userId),
      }
>>>>>>> c800e6ccbbccb4c37b12cb33ae2e84d31ad3f529
>>>>>>> 44b5f76e0a11799c862a981775c1a3a71ac974a4
    };
  }
}
