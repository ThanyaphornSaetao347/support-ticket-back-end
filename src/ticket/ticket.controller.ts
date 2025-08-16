import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  ParseIntPipe,
  UseGuards,
  Req,
  Request,
  Delete,
  Patch,
  HttpStatus,
  HttpException,
  UseInterceptors,
  UploadedFiles,
  HttpCode,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
  Query
} from '@nestjs/common';
import { TicketService } from './ticket.service';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { JwtAuthGuard } from '../auth/jwt_auth.guard';
import { TicketStatusService } from '../ticket_status/ticket_status.service';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CreateSatisfactionDto } from '../satisfaction/dto/create-satisfaction.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Ticket } from './entities/ticket.entity';
import { ForbiddenTransactionModeOverrideError, Repository } from 'typeorm';
import { NotificationType } from '../notification/entities/notification.entity';
import { NotificationService } from '../notification/notification.service';
import { requirePermissions, RequireRoles } from '../permission/permission.decorator';
import { PermissionService } from '../permission/permission.service';
import { TicketAssigned } from 'src/ticket_assigned/entities/ticket_assigned.entity';
import { UserService } from 'src/users/users.service';


@Controller('api')
export class TicketController {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    private readonly ticketService: TicketService,
    private readonly ticketStatusService: TicketStatusService,
    private readonly ststusService: TicketStatusService,
    private readonly notiService: NotificationService,
    private readonly permissionService: PermissionService,
    private readonly userService: UserService,
  ){}

  // ✅ เพิ่ม Language Detection Methods
  private getLanguage(req: any, defaultLang: string = 'th'): string {
    try {
      console.log('🌐 Detecting language...');
      
      // 1. จาก query parameter (?lang=th) - ความสำคัญสูงสุด
      if (req.query && req.query.lang) {
        const queryLang = String(req.query.lang).toLowerCase();
        console.log(`✅ Language from query: ${queryLang}`);
        return this.validateLanguage(queryLang, defaultLang);
      }

      // 2. จาก custom header (X-Language: th)
      if (req.headers) {
        const customLang = req.headers['x-language'] || req.headers['x-lang'];
        if (customLang) {
          const headerLang = String(customLang).toLowerCase();
          console.log(`✅ Language from header: ${headerLang}`);
          return this.validateLanguage(headerLang, defaultLang);
        }
      }

      // 3. จาก Accept-Language header
      if (req.headers && req.headers['accept-language']) {
        const acceptLang = req.headers['accept-language'];
        console.log(`🔍 Accept-Language: ${acceptLang}`);
        
        const parsedLang = this.parseAcceptLanguage(acceptLang);
        if (parsedLang) {
          console.log(`✅ Detected language from Accept-Language: ${parsedLang}`);
          return parsedLang;
        }
      }

      // 4. จาก user preferences (ถ้ามี user context)
      if (req.user && req.user.preferred_language) {
        const userLang = String(req.user.preferred_language).toLowerCase();
        console.log(`✅ Language from user preferences: ${userLang}`);
        return this.validateLanguage(userLang, defaultLang);
      }

      // 5. Default case
      console.log(`⚠️ Using default language: ${defaultLang}`);
      return defaultLang;
      
    } catch (error) {
      console.error(`❌ Error detecting language:`, error);
      return defaultLang;
    }
  }

  // ✅ ตรวจสอบว่าภาษาที่ได้รับเป็นภาษาที่รองรับหรือไม่
  private validateLanguage(lang: string, defaultLang: string): string {
    const normalizedLang = lang.toLowerCase().trim();
    
    // แปลงชื่อภาษาให้เป็นรหัสมาตรฐาน
    const langMapping = {
      'th': 'th',
      'thai': 'th',
      'thailand': 'th',
      'en': 'en',
      'eng': 'en',
      'english': 'en',
      'us': 'en',
      'gb': 'en'
    };

    return langMapping[normalizedLang] || defaultLang;
  }

  // ✅ แยกการ parse Accept-Language header
  private parseAcceptLanguage(acceptLanguage: string): string | null {
    try {
      // Accept-Language: th,en;q=0.9,en-US;q=0.8
      const languages = acceptLanguage
        .split(',')
        .map(lang => {
          const [code, qValue] = lang.split(';');
          return {
            code: code.trim().toLowerCase(),
            quality: qValue ? parseFloat(qValue.replace('q=', '')) : 1.0
          };
        })
        .sort((a, b) => b.quality - a.quality); // เรียงตาม quality

      for (const lang of languages) {
        const mainLang = lang.code.split('-')[0]; // th-TH -> th
        const validatedLang = this.validateLanguage(mainLang, 'th');
        
        if (validatedLang !== 'th' || mainLang === 'th') {
          return validatedLang;
        }
      }

      return null;
    } catch (error) {
      console.error('❌ Error parsing Accept-Language:', error);
      return null;
    }
  }

  // ✅ ช่วยในการ log ข้อมูล request
  private logRequestInfo(req: any, additionalInfo: any = {}) {
    console.log('📝 Request Info:', {
      method: req.method,
      url: req.url,
      query: req.query,
      headers: {
        'accept-language': req.headers && req.headers['accept-language'],
        'x-language': req.headers && req.headers['x-language'],
        'x-lang': req.headers && req.headers['x-lang'],
      },
      user: req.user ? { id: req.user.id, username: req.user.username } : null,
      ...additionalInfo
    });
  }

  // ✅ ปรับปรุง checkPermission ให้ debug ชัดเจนขึ้น
  // ===================== Permission & Ownership Check =====================

  private async checkPermission(userId: number, role_id: number[]): Promise<boolean> {
    if (!userId || !role_id?.length) return false;

    try {
        console.log(`🔒 checkPermission: userId=${userId}, role_id=${role_id}`);

        // ดึงสิทธิ์ของ user จาก DB
        const userPermissions: number[] = await this.ticketService.checkUserPermissions(userId);
        console.log('📋 Permissions from DB:', userPermissions);

        if (!userPermissions?.length) return false;

        // ตรวจสอบว่า user มีอย่างน้อยหนึ่งสิทธิ์ที่ต้องการ
        const allowed = role_id.some(pid => userPermissions.includes(pid));
        console.log('✅ Has permission?', allowed);

        return allowed;
    } catch (error) {
        console.error('💥 checkPermission error:', error);
        return false;
    }
  }

  private async isTicketOwner(userId: number, ticketId: number, userPermissions: number[]): Promise<boolean> {
    if (!userId || !ticketId) return false;
    try {
        const isOwner = await this.ticketService.checkTicketOwnership(userId, ticketId, userPermissions);
        if (!isOwner) {
          throw new ForbiddenException('คุณไม่มีสิทธิ์เข้าถึงตั๋วนี้');
        }
        console.log(`👤 isTicketOwner: userId=${userId}, ticketId=${ticketId}, owner=${isOwner}`);
        return isOwner;
    } catch (error) {
        console.error('💥 isTicketOwner error:', error);
        return false;
    }
  }

  private async isTicketOwnerByNo(userId: number, ticketNo: string, userPermissions: number[]): Promise<boolean> {
    if (!userId || !ticketNo) return false;
    try {
        const isOwner = await this.ticketService.checkTicketOwnershipByNo(userId, ticketNo, userPermissions);
        if (!isOwner) {
          throw new ForbiddenException('คุณไม่มีสิทธิ์เข้าถึงตั๋วนี้');
        }
        console.log(`👤 isTicketOwnerByNo: userId=${userId}, ticketNo=${ticketNo}, owner=${isOwner}`);
        return isOwner;
    } catch (error) {
        console.error('💥 isTicketOwnerByNo error:', error);
        return false;
    }
  }

  // ===================== General Access =====================

  private async canAccessTicket(userId: number, ticketId: number, userPermissions: number[]): Promise<boolean> {
    try {
      console.log(`🔍 Checking ticket access: ticket ${ticketId}, user ${userId}`);
      
      if (!userId || !ticketId) {
        console.log(`❌ Invalid parameters: userId=${userId}, ticketId=${ticketId}`);
        return false;
      }
      // ถ้ามีสิทธิ์ใดใน [2, 12, 13] ก็ผ่าน
      const hasTrack = [2, 12, 13].some(p => userPermissions.includes(p));
      if (hasTrack) return true;

      // ถ้าไม่มีสิทธิ์ข้างต้น ให้เช็คว่าเป็นเจ้าของตั๋วหรือไม่
      const owner = await this.isTicketOwner(userId, ticketId, userPermissions);
      return owner;
    } catch (error) {
      console.error('Error', error);
      throw error;
    }
  }

  private async canAccessTicketByNo(userId: number, ticketNo: string, userPermissions: number[]): Promise<boolean> {
    try {
      if (!userId || !ticketNo) return false;
      // ✅ ตรวจสอบแบบ some: ถ้ามีอย่างน้อย 1 permission ใน [2,12,13] → ผ่าน
      const allowedRoles = [2, 12, 13];
      const hasPermission = allowedRoles.some(role => userPermissions.includes(role));
      if (hasPermission) return true;

      // ✅ ตรวจสอบเจ้าของตั๋ว
      const owner = await this.isTicketOwnerByNo(userId, ticketNo, userPermissions);
      return owner;
    } catch (error) {
      console.error('Error', error);
      throw error;
    }
  }

  // ===================== Edit / Delete =====================

  private async canEditTicket(
    userId: number,
    ticketNo: string,
    userPermissions: number[]
  ): Promise<boolean> {
    // ตรวจสอบ permission แบบตรง ๆ
    if (userPermissions.includes(3)) return true; // EDIT_TICKET = 3

    // ตรวจสอบว่าเป็นเจ้าของตั๋ว
    const owner = await this.isTicketOwnerByNo(userId, ticketNo, userPermissions);
    return owner;
  }

  private async canDeleteTicket(
    userId: number,
    ticketNo: string,
    userPermissions: number[]
  ): Promise<boolean> {
    // ตรวจสอบ permission แบบตรง ๆ
    if (userPermissions.includes(4)) return true; // DELETE_TICKET = 4

    // ตรวจสอบว่าเป็นเจ้าของตั๋ว
    const owner = await this.isTicketOwnerByNo(userId, ticketNo, userPermissions);
    return owner;
  }

  // ===================== View Tickets =====================

  private async canViewTicketDetail(userId: number, ticketNo: string): Promise<boolean> {
    if (!userId) return false;

    const numericUserId = typeof userId === 'string' ? parseInt(userId) : userId;
    if (isNaN(numericUserId)) return false;

    // ดึงสิทธิ์จาก DB
    const userPermissions: number[] = await this.ticketService.checkUserPermissions(numericUserId);
    console.log('📋 User permissions:', userPermissions);

    // VIEW_ALL_TICKETS = 13
    if (userPermissions.includes(13)) return true;

    // Role ที่ต้องตรวจสอบเจ้าของตั๋ว (role_id = 12)
    if (userPermissions.includes(12)) {
      if (!ticketNo) return false;
      
      const ticket = await this.ticketService.getTicketByNo(ticketNo);
      if (!ticket) return false;
      
      return ticket.create_by === numericUserId;
    }

    // TRACK_TICKET = 2
    if (userPermissions.includes(2)) return true;

    // ถ้า user เป็นเจ้าของตั๋ว
    if (ticketNo) {
      const owner = await this.isTicketOwnerByNo(numericUserId, ticketNo, userPermissions);
      if (owner) return true;
    }

    return false;
  }

  private async canViewAllTicket(userId: number, ticket_no: string): Promise<boolean> {
    if (!userId) return false;

    const numericUserId = typeof userId === 'string' ? parseInt(userId) : userId;
    if (isNaN(numericUserId)) return false;

    // ดึงสิทธิ์จาก DB
    const userPermissions: number[] = await this.ticketService.checkUserPermissions(numericUserId);
    console.log('📋 User permissions:', userPermissions);

    // กำหนด roles ที่อนุญาตให้ดูตั๋ว
    const allowRoles = [2, 12, 13];

    // ถ้า user มีสิทธิ์ใด ๆ ใน allowRoles ให้ผ่าน
    if (userPermissions.some(p => allowRoles.includes(p))) {
      // ตรวจสอบเฉพาะ role_id = 12 ว่าเป็นเจ้าของตั๋วหรือไม่
      if (userPermissions.includes(12) && ticket_no) {
        const tickets = await this.ticketService.getTicketsByCreator(userId);
        if (tickets && tickets.length) {
          const ticketOwnerId = tickets[0].create_by;
          return ticketOwnerId === numericUserId;
        }
        return false;
      }
      return true;
    }

    // ถ้า user เป็นเจ้าของตั๋วโดยตรง
    if (ticket_no) {
      const owner = await this.isTicketOwnerByNo(numericUserId, ticket_no, userPermissions);
      if (owner) return true;
    }

    return false;
  }

  private async canCreateTicket(userId: number): Promise<boolean> {
    try {
        console.log('🔐 === canCreateTicket Debug ===');
        console.log('Input userId:', userId);

        if (!userId) {
            console.log('❌ userId is invalid');
            return false;
        }

        const numericUserId = typeof userId === 'string' ? parseInt(userId) : userId;
        if (isNaN(numericUserId)) {
            console.log('❌ userId is not a valid number:', userId);
            return false;
        }

        // ดึง role ของ user จริงจาก DB
        const userRoles: number[] = await this.permissionService.get_permission_byOne(numericUserId);
        console.log('User roles from DB:', userRoles);

        // ตรวจสอบ role_id = 1
        const hasRequiredRole = userRoles.some(roleId => roleId === 1);
        console.log(`User has role_id=1: ${hasRequiredRole ? '✅' : '❌'}`);

        return hasRequiredRole;
    } catch (error) {
        console.error('💥 Error in canCreateTicket:', error);
        return false;
    }
  }

  private async canSolveProblem(userId: number): Promise<boolean> {
    try {
      // ดึง role ของ user จาก DB
      const userRoles: number[] = await this.ticketService.checkUserPermissions(userId);

      // ถ้ามี role_id 8 => สามารถแก้ปัญหาได้
      return userRoles.includes(8);
    } catch (error) {
      console.error('Error checking solve permission:', error);
      return false;
    }
  }

  // ✅ ฟังก์ชันตรวจสอบสิทธิ์ในการเปลี่ยนสถานะ (เฉพาะ role_id = 5)
  private async canChangeTicketStatus(userId: number): Promise<boolean> {
    if (!userId) return false;

    const numericUserId = typeof userId === 'string' ? parseInt(userId) : userId;
    if (isNaN(numericUserId)) return false;

    try {
      // ดึง role ของผู้ใช้จาก DB
      const roles: number[] = await this.ticketService.checkUserPermissions(numericUserId);
      console.log('📋 User roles:', roles);

      // ตรวจสอบว่า roles มี role_id = 5 หรือไม่
      const hasPermission = roles.some(role => role === 5);
      console.log(`🔒 Can change status: ${hasPermission}`);
      return hasPermission;
    } catch (error) {
      console.error('💥 Error checking change status permission:', error);
      return false;
    }
  }

  private async canRestoreTicket(userId: number, ticket_no: string): Promise<boolean> {
    if (!userId || !ticket_no) return false;

    const numericUserId = typeof userId === 'string' ? parseInt(userId) : userId;
    if (isNaN(numericUserId)) return false;

    try {
      // 1️⃣ ตรวจสอบ role_id
      const roles: number[] = await this.ticketService.checkUserPermissions(numericUserId);
      if (!roles.includes(11)) return false;

      // 2️⃣ ตรวจสอบวันลบตั๋ว
      const ticket = await this.ticketService.getTicketByNo(ticket_no);
      if (!ticket || !ticket.deleted_at) return false;

      const deletedAt = new Date(ticket.deleted_at);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      return deletedAt > sevenDaysAgo;
    } catch (error) {
      console.error('💥 Error checking restore permission:', error);
      return false;
    }
  }

  private async canViewTicketDelete(userId: number, ticketNo?: string): Promise<boolean> {
    if (!userId) return false;

    const numericUserId = typeof userId === 'string' ? parseInt(userId) : userId;
    if (isNaN(numericUserId)) return false;

    // ดึง role_id ของ user จาก DB
    const userRoles: number[] = await this.ticketService.checkUserPermissions(numericUserId);
    console.log('📋 User roles:', userRoles);

    // ตรวจสอบ role_id 13 สามารถดูได้เลย
    if (userRoles.includes(13)) return true;

    // role_id 12 ต้องเป็นเจ้าของตั๋ว
    if (userRoles.includes(12)) {
      if (!ticketNo) return false;

      // ดึงตั๋วจาก DB
      const tickets = await this.ticketService.getTicketsByCreator(userId); 
      if (!tickets || !tickets.length) return false;

      const ticketOwnerId = tickets[0].create_by;
      return ticketOwnerId === numericUserId;
    }

    return false;
  }

  private canRestoredate(deletedAt?: Date | string | null): boolean {
    if (!deletedAt) return false;

    const deletedDate = deletedAt instanceof Date ? deletedAt : new Date(deletedAt);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return deletedDate > sevenDaysAgo;
  }

  private canSatisfaction(roleId: number): boolean {
    return roleId === 14;
  }

  private async sendTicketNotification(
    ticketNo: string,
    actionType: 'NEW' | 'STATUS_CHANGE' | 'ASSIGN',
    payload: { userId: number; assignedToUserId?: number; newStatusId?: number }
  ) {
    const normalizedTicketNo = ticketNo.toUpperCase().startsWith('T')
      ? ticketNo.toUpperCase()
      : 'T' + ticketNo.toUpperCase();

    let targetUserIds: number[] = [];

    switch (actionType) {
      case 'NEW':
        targetUserIds = await this.userService.getUserIdsByRole([15, 16]);
        break;
      case 'STATUS_CHANGE':
        targetUserIds = await this.userService.getUserIdsByRole([2], { createBy: payload.userId });
        break;
      case 'ASSIGN':
        if (payload.assignedToUserId) {
          const hasRole9 = await this.userService.hasRole(payload.assignedToUserId, [9]);
          if (hasRole9) targetUserIds.push(payload.assignedToUserId);
        }
        break;
    }

    await Promise.all(
      targetUserIds.map((uid) =>
        this.notiService.createNotification({
          ticket_no: normalizedTicketNo,
          user_id: uid,
          notification_type: actionType as any, // cast เป็น NotificationType หรือแปลงให้ตรง enum
          title: `Ticket ${normalizedTicketNo} Notification`,
          message: `Action: ${actionType}`,
          is_read: false,
          email_sent: false,
        }),
      ),
    );
  }
  
  @UseGuards(JwtAuthGuard)
  @Post('saveTicket')
  async saveTicket(@Body() dto: any, @Request() req: any): Promise<any> {
    const userId = req.user?.id || req.user?.sub || req.user?.user_id || req.user?.userId;

    if (!userId) {
        return { code: 2, message: 'User not authenticated properly', data: null };
    }

    const canCreate = await this.canCreateTicket(userId);
    if (!canCreate) {
        return { code: 2, message: 'User does not have the required role to create a ticket', data: null };
    }

    // ส่วน validate และ save ticket เหมือนเดิม
    const transformedDto = {
        ticket_id: dto.ticket_id ? parseInt(dto.ticket_id) : undefined,
        project_id: parseInt(dto.project_id),
        categories_id: parseInt(dto.categories_id),
        issue_description: dto.issue_description,
        status_id: dto.status_id ? parseInt(dto.status_id) : 1,
        issue_attachment: dto.issue_attachment || null,
    };

    try {
        const result = await this.ticketService.saveTicket(transformedDto, userId);
        return {
            code: 1,
            message: 'Success',
            ticket_id: result.ticket_id,
            ticket_no: result.ticket_no,
        };
    } catch (error) {
        return { code: 2, message: error.message || 'เกิดข้อผิดพลาด', data: null };
    }
  }

  // ✅ แก้ไข getTicketData ให้ใช้ ticket_no แทน ticket_id
  @UseGuards(JwtAuthGuard)
  @Post('getTicketData')
  async getTicketData(@Body() body: { ticket_no: string }, @Req() req: any) {
    try {
      const userId = this.extractUserId(req);
      if (!userId) {
        return { code: 2, message: 'ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่', data: null };
      }

      const ticketNo = body.ticket_no?.toString().trim().toUpperCase();
      if (!ticketNo) {
        return { code: 2, message: 'กรุณาส่ง ticket_no', data: null };
      }

      // ตรวจสอบสิทธิ์จาก role_id
      const canView = await this.canViewTicketDetail(userId, ticketNo);
      if (!canView) {
        return { code: 2, message: 'ไม่มีสิทธิ์ในการดูตั๋วปัญหานี้', data: null };
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const data = await this.ticketService.getTicketData(ticketNo, baseUrl);

      return { code: 1, message: 'Success', data };
    } catch (error) {
      console.error('Error in getTicketData:', error);
      return { code: 2, message: error.message || 'เกิดข้อผิดพลาด', data: null };
    }
  }

  @Post('getAllTicket')
  @UseGuards(JwtAuthGuard)
  async getAllTicket(@Request() req: any) {
    try {
      const userId = req.user?.id || req.user?.userId || req.user?.user_id || req.user?.sub;
      if (!userId) {
        return {
          success: false,
          message: 'User ID not found in token'
        };
      }

      console.log('👤 Getting all tickets for userId:', userId);

      // ดึง tickets ทั้งหมดจาก DB
      const allTickets = await this.ticketService.getAllTicket(userId);
      console.log('📊 Total tickets from DB:', allTickets?.length || 0);

      // ✅ แก้ไข: กำหนด type อย่างชัดเจน
      const filteredTickets: any[] = [];
      
      for (const ticket of allTickets) {
        const canView = await this.canViewAllTicket(userId, ticket.ticket_no);
        if (canView) {
          filteredTickets.push(ticket); // ✅ ตอนนี้ TypeScript รู้ type แล้ว
        }
      }

      console.log('✅ Filtered tickets count:', filteredTickets.length);

      return {
        success: true,
        data: filteredTickets,
        debug: {
          userId: userId,
          totalTickets: allTickets?.length || 0,
          filteredCount: filteredTickets.length,
        }
      };
    } catch (error) {
      console.error('💥 Error in getAllTicket:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('saveSupporter/:ticket_no')
  @UseInterceptors(FilesInterceptor('attachments'))
  async saveSupporter(
    @Param('ticket_no') ticketNo: string,
    @Body() formData: any,
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req: any
  ) {
    try {
      const userId = req.user?.id || req.user?.userId || req.user?.user_id || req.user?.sub;
      if (!userId) {
        return {
          success: false,
          message: 'User ID not found in token'
        };
      }

      // ✅ ตรวจสอบ role_id ของ user
      const canSolve = await this.canSolveProblem(userId);
      if (!canSolve) {
        return {
          success: false,
          message: 'User does not have permission to solve problems'
        };
      }

      const result = await this.ticketService.saveSupporter(
        ticketNo,
        formData,
        files,
        userId
      );

      return {
        success: true,
        message: 'Supporter data saved successfully',
        data: result
      };
    } catch (error) {
      console.error('Error in saveSupporter:', error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to save supporter data',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('getAllMasterFilter')
  async getAllMasterFilter(@Req() req) {
    try {
      console.log('📋 === getAllMasterFilter Debug ===');

      const userId = this.extractUserId(req);
      console.log('👤 Extracted userId:', userId);

      if (!userId) {
        throw new ForbiddenException('ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่');
      }

      // ✅ ตรวจสอบสิทธิ์การดูตั๋ว
      // const canView = await this.isTicketOwner(userId);
      // if (!canView) {
      //   throw new ForbiddenException('ไม่มีสิทธิ์ในการเข้าถึงข้อมูลนี้');
      // }

      // ✅ ดึงข้อมูล Master Filter
      const result = await this.ticketService.getAllMAsterFilter(userId);
      console.log('✅ getAllMasterFilter success');

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('💥 Error in getAllMasterFilter:', error);

      if (error instanceof ForbiddenException) {
        throw error;
      }

      throw new HttpException('เกิดข้อผิดพลาดในระบบ', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ✅ Specific ticket routes (with "ticket" prefix) come BEFORE generic :id route
 @Get('tickets/:ticket_no')
  @UseGuards(JwtAuthGuard)
  async getTicketByNo(@Param('ticket_no') ticketNo: string, @Req() req: any) {
    try {
      // ✅ ดึง userId จาก token
      const userId = req.user?.id || req.user?.userId || req.user?.user_id || req.user?.sub;
      if (!userId) {
        return {
          code: 2,
          message: 'ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่',
          data: null,
        };
      }

      // ✅ ตรวจสอบสิทธิ์ก่อน
      const userPermissions: number[] = await this.ticketService.checkUserPermissions(userId);
      console.log('User permission:', userPermissions)

      const canAccess = await this.canAccessTicketByNo(userId, ticketNo, userPermissions);
      if (!canAccess) {
        return {
          code: 2,
          message: 'คุณไม่มีสิทธิ์เข้าถึงตั๋วนี้',
          data: null,
        };
      }

      // ✅ ดึงข้อมูลตั๋ว
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const data = await this.ticketService.getTicketData(ticketNo, baseUrl);

      return {
        code: 1,
        message: 'Success',
        data,
      };
    } catch (error) {
      console.error('Error in getTicketByNo:', error);
      return {
        code: 2,
        message: error.message || 'เกิดข้อผิดพลาด',
        data: null,
      };
    }
  }

  @Put('tickets/:ticket_no')
  @UseGuards(JwtAuthGuard)
  async updateTicketByNo(
    @Param('ticket_no') ticket_no: string,
    @Body() updateDto: UpdateTicketDto,
    @Request() req: any
  ) {
    try {
      const userId = this.extractUserId(req);

      if (!userId) {
        return {
          code: 2,
          message: 'User not authenticated',
          data: null,
        };
      }

      // ✅ ตรวจสอบสิทธิ์ก่อนแก้ไข

      const userPermissions: number[] = await this.ticketService.checkUserPermissions(userId);
      console.log('User permission:', userPermissions)

      const canEdit = await this.canEditTicket(userId, ticket_no, userPermissions);
      if (!canEdit) {
        return {
          code: 2,
          message: 'คุณไม่มีสิทธิ์ในการแก้ไขตั๋วนี้',
          data: null,
        };
      }

      // ✅ เรียก service เพื่ออัปเดตตั๋ว
      const ticket = await this.ticketService.updateTicket(ticket_no, updateDto, userId);

      return {
        code: 1,
        message: 'Ticket updated successfully',
        data: ticket,
      };
    } catch (error) {
      console.error('Error:', error.message);
      return {
        code: 2,
        message: error.message || 'เกิดข้อผิดพลาด',
        data: null,
      };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Patch('updateTicketStatus/:id')
  @ApiOperation({ summary: 'Update ticket status and log history' })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  @ApiResponse({ status: 200, description: 'Ticket status updated successfully' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  async updateTicketStatus(
    @Param('id', ParseIntPipe) ticketId: number,
    @Body() body: { 
      status_id: number;
      fix_issue_description?: string;
      comment?: string;
    },
    @Request() req: any,
  ) {
    try {
      const userId = this.extractUserId(req);
      if (!userId) {
        throw new HttpException('User not authenticated properly', HttpStatus.UNAUTHORIZED);
      }

      // ✅ ตรวจสอบสิทธิ์ด้วยฟังก์ชันแยก
      const canChange = await this.canChangeTicketStatus(userId);
      if (!canChange) {
        return {
          code: 2,
          message: 'คุณไม่มีสิทธิ์เปลี่ยนสถานะตั๋ว',
          data: null,
        };
      }

      // ✅ Validate status_id
      if (!body.status_id || isNaN(body.status_id)) {
        return {
          code: 2,
          message: 'status_id must be a valid number',
          data: null,
        };
      }

      const result = await this.ticketStatusService.updateTicketStatusAndHistory(
        ticketId, 
        body.status_id, 
        userId,
        body.fix_issue_description,
        body.comment
      );

      return {
        code: 1,
        message: 'Ticket status updated successfully',
        data: result,
      };
    } catch (error) {
      console.error('💥 Error updating ticket status:', error);
      return {
        code: 2,
        message: error.message || 'Failed to update ticket status',
        data: null,
      };
    }
  }

  // ✅ ลบตั๋วด้วย ticket_no
  @Delete('tickets/:ticket_no')
  @UseGuards(JwtAuthGuard)
  async deleteTicketByNo(
    @Param('ticket_no') ticket_no: string,
    @Request() req: any
  ) {
    try {
      const userId = this.extractUserId(req);
      if (!userId) {
        return { code: 2, message: 'User not authenticated', data: null };
      }

      // ✅ ตรวจสอบสิทธิ์ก่อนลบ
      const userPermissions: number[] = await this.ticketService.checkUserPermissions(userId);
      console.log('User permission:', userPermissions)

      const canDelete = await this.canDeleteTicket(userId, ticket_no, userPermissions);
      if (!canDelete) {
        return { code: 2, message: 'คุณไม่มีสิทธิ์ลบตั๋วนี้', data: null };
      }

      await this.ticketService.softDeleteTicket(ticket_no, userId);

      return {
        code: 1,
        message: 'ลบตั๋วสำเร็จ',
        data: { ticket_no, deleted_by: userId, deleted_at: new Date().toISOString() },
      };
    } catch (error) {
      console.error('💥 Error deleting ticket:', error);
      return {
        code: 2,
        message: error.message || 'เกิดข้อผิดพลาดในการลบตั๋ว',
        data: null,
      };
    }
  }

  // ✅ กู้คืนตั๋ว
  @Post('tickets/restore/:ticker_no')
  @UseGuards(JwtAuthGuard)
  async restoreTicketByNo(
    @Param('ticket_no') ticket_no: string,
    @Request() req: any
  ) {
    try {
      const userId = this.extractUserId(req);
      if (!userId) {
        return { code: 2, message: 'User not authenticated', data: null };
      }

      // ✅ ตรวจสอบสิทธิ์ก่อน restore
      const canRestore = await this.canRestoreTicket(userId, ticket_no);
      if (!canRestore) {
        return { code: 2, message: 'คุณไม่มีสิทธิ์กู้คืนตั๋ว', data: null };
      }

      await this.ticketService.restoreTicketByNo(ticket_no, userId);

      return {
        code: 1,
        message: 'กู้คืนตั๋วสำเร็จ',
        data: {
          ticket_no,
          restored_by: userId,
          restored_at: new Date().toISOString()
        },
      };
    } catch (error) {
      console.error('💥 Error restoring ticket:', error);
      return {
        code: 2,
        message: error.message || 'เกิดข้อผิดพลาดในการกู้คืน',
        data: null,
      };
    }
  }

  // ✅ ดูรายการตั๋วที่ถูกลบ (สำหรับ admin)
  // ✅ ดูรายการตั๋วที่ถูกลบ (สำหรับผู้ที่มีสิทธิ์ดูทั้งหมด)
  @Get('tickets/deleted')
  @UseGuards(JwtAuthGuard)
  async softDeleteTicket(@Request() req: any) {
    try {
      const userId = this.extractUserId(req);

      if (!userId) {
        return {
          code: 2,
          message: 'ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่',
          data: null,
        };
      }

      // ✅ ตรวจสอบสิทธิ์โดยใช้ canViewAllTicket
      const canView = await this.canViewTicketDelete(userId);
      if (!canView) {
        return {
          code: 2,
          message: 'คุณไม่มีสิทธิ์ดูรายการตั๋วที่ถูกลบ',
          data: null,
        };
      }

      // ✅ ดึงรายการตั๋วที่ถูกลบ
      const deletedTickets = await this.ticketService.getDeletedTickets();

      return {
        code: 1,
        message: 'ดึงรายการตั๋วที่ถูกลบสำเร็จ',
        data: deletedTickets,
      };
    } catch (error) {
      console.error('💥 Error getting deleted tickets:', error);
      return {
        code: 2,
        message: error.message || 'เกิดข้อผิดพลาด',
        data: null,
      };
    }
  }

  // ✅ แก้ไขใน getDeletedTickets method
  async getDeletedTickets(@Request() req: any) {
    try {
      const userId = this.extractUserId(req);
      if (!userId) {
        return {
          code: 2,
          message: 'ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่',
          data: null,
        };
      }

      // ✅ ตรวจสอบสิทธิ์การดูตั๋วที่ถูกลบตาม role_id = [12,13]
      const canView = await this.canViewTicketDelete(userId);
      if (!canView) {
        throw new ForbiddenException('ไม่มีสิทธิ์ในการดูตั๋วที่ถูกลบ');
      }

      // ✅ ดึงข้อมูลตั๋วที่ถูกลบ
      const deletedTickets = await this.ticketService.getDeletedTickets();

      // ✅ เพิ่ม can_restore
      const processedTickets = deletedTickets.map(ticket => ({
        ...ticket,
        can_restore: ticket.update_date ? this.canRestoredate(ticket.deleted_at) : false
      }));

      return {
        code: 1,
        message: 'ดึงรายการตั๋วที่ถูกลบสำเร็จ',
        data: processedTickets,
      };
    } catch (error) {
      console.error('💥 Error getting deleted tickets:', error);
      return {
        code: 2,
        message: error.message || 'เกิดข้อผิดพลาด',
        data: null,
      };
    }
  }

  // rating from user
  @Post('satisfaction/:ticket_no')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async saveSatisfaction(
    @Param('ticket_no') ticketNo: string,
    @Body() createSatisfactionDto: CreateSatisfactionDto,
    @Request() req: any
  ) {
    try {
      const userId = req.user?.id;
      const roleId = req.user?.role_id;

      // ✅ เช็คสิทธิ์ role_id = 14
      if (!this.canSatisfaction(roleId)) {
        throw new ForbiddenException('ไม่มีสิทธิ์ให้คะแนนความพึงพอใจ');
      }

      const result = await this.ticketService.saveSatisfaction(
        ticketNo,
        createSatisfactionDto,
        userId
      );
      
      return {
        success: true,
        message: 'บันทึกคะแนนความพึงพอใจสำเร็จ',
        data: result
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'ไม่สามารถบันทึกการประเมินได้',
          error: error.message
        },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // ตรวจสอบสิทธิ์เฉพาะ
  @Post('check-permission')
  @UseGuards(JwtAuthGuard)
  async checkSpecificPermission(
    @Body() body: { permissions?: number[], role_ids?: number[] },
    @Request() req: any
  ) {
    try {
      const userId = this.extractUserId(req);
      const roleId = req.user?.role_id;

      let hasPermission = true;

      if (body.permissions?.length) {
        hasPermission = await this.checkPermission(userId!, body.permissions);
      }

      if (body.role_ids?.length) {
        hasPermission = hasPermission && body.role_ids.includes(roleId);
      }
      
      return {
        success: true,
        data: {
          user_id: userId,
          role_id: roleId,
          has_permission: hasPermission,
          required_permissions: body.permissions || [],
          required_roles: body.role_ids || []
        }
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  // ✅ Helper methods
  private isValidTicketNoFormat(ticketNo: string): boolean {
    // Format: T + 9 digits (T250660062)
    const ticketPattern = /^T\d{9}$/;
    return ticketPattern.test(ticketNo);
  }

  // ✅ ปรับปรุง extractUserId ให้ debug และ handle หลาย format
  private extractUserId(req: any): number | null {
    console.log('🔍 Request user object:', req.user);
    console.log('🔍 === extractUserId Debug ===');
    console.log('Full req.user object:', JSON.stringify(req.user, null, 2));
    
    // ลองหาจากทุก property ที่เป็นไปได้
    const possibleUserIds = [
      req.user?.id,
      req.user?.userId, 
      req.user?.user_id,
      req.user?.sub,
      req.user?.ID,
      req.user?.Id,
      req.user?.USER_ID
    ];
    
    console.log('Possible userIds:', possibleUserIds);
    
    // หาค่าแรกที่ไม่ใช่ undefined/null
    const userId = possibleUserIds.find(id => id !== undefined && id !== null);
    
    console.log('Selected userId:', userId, 'Type:', typeof userId);
    
    // แปลงเป็น number
    const numericUserId = userId ? parseInt(userId.toString()) : null;
    
    console.log('Final numeric userId:', numericUserId);
    console.log('=== End extractUserId Debug ===');
    
    return numericUserId;
  }

  // ✅ เพิ่ม method ตรวจสอบ user object
  private debugUserObject(req: any): void {
    console.log('🔍 === User Object Debug ===');
    console.log('req.user exists:', !!req.user);
    console.log('req.user type:', typeof req.user);
    console.log('req.user keys:', req.user ? Object.keys(req.user) : 'no keys');
    console.log('req.user values:', req.user ? Object.values(req.user) : 'no values');
    
    if (req.user) {
      // ตรวจสอบแต่ละ property
      ['id', 'userId', 'user_id', 'sub', 'ID', 'Id', 'USER_ID'].forEach(prop => {
        console.log(`req.user.${prop}:`, req.user[prop], typeof req.user[prop]);
      });
    }
    
    console.log('=== End User Object Debug ===');
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/status')
  async getTicketStatus(
    @Param('id', ParseIntPipe) ticketId: number,
    @Req() req: any
  ) {
    try {
      console.log('🚀 Request started for ticket:', ticketId);

      const userId = this.extractUserId(req);
      if (!userId) {
        throw new UnauthorizedException('Cannot extract user information from token');
      }

      // ✅ ตรวจสอบสิทธิ์การเข้าถึงด้วย role
      const userPermissions = req.user.permission || [];
      const hasAccess = await this.canAccessTicket(userId, ticketId, userPermissions)
      if (!hasAccess) {
        throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงสถานะตั๋วปัญหานี้');
      }

      const languageId = this.getLanguage(req);

      const ticketStatus = await this.ticketStatusService.getTicketStatusWithName(
        ticketId,
        languageId
      );

      if (!ticketStatus) {
        throw new NotFoundException(`ไม่พบตั๋วปัญหา ID: ${ticketId}`);
      }

      return {
        code: 1,
        message: 'Success',
        data: {
          ...ticketStatus,
          detected_language: languageId,
          request_timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      console.error('💥 Error getting ticket status:', error);

      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      return {
        code: 0,
        message: 'ไม่สามารถดึงสถานะตั๋วปัญหาได้',
        error: error.message,
        data: null
      };
    }
  }

  // ✅ Fixed: Get user notifications with proper error handling
  @UseGuards(JwtAuthGuard)
  @Get('getUserNotification')
  async getUserNotification(
    @Req() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('type') type?: NotificationType
  ) {
    try {
      const userId = this.extractUserId(req);
      if (!userId) {
        throw new ForbiddenException('ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่');
      }

      // ✅ Proper parameter validation
      const pageNumber = Math.max(1, parseInt(page) || 1);
      const limitNumber = Math.min(100, Math.max(1, parseInt(limit) || 20));

      let result;
      if (type && Object.values(NotificationType).includes(type)) {
        result = await this.notiService.getNotificationsByType(
          userId,
          type,
          pageNumber,
          limitNumber
        );
      } else {
        result = await this.notiService.getUserNotifications(
          userId,
          pageNumber,
          limitNumber
        );
      }

      return {
        success: true,
        data: result,
        message: 'ดึงข้อมูลการแจ้งเตือนสำเร็จ',
      };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลการแจ้งเตือน',
        },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // ✅ Get unread count
  @UseGuards(JwtAuthGuard)
  @Get('unread-count')
  async getUnreadCount(@Req() req: any) {
    try {
      const userId = this.extractUserId(req);
      if (!userId) {
        throw new ForbiddenException('ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่');
      }

      const count = await this.notiService.getUnreadCount(userId);

      return {
        success: true,
        data: {
          unread_count: count,
          user_id: userId,
        },
        message: 'ดึงจำนวนการแจ้งเตือนสำเร็จ',
      };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: error.message || 'เกิดข้อผิดพลาดในการดึงจำนวนการแจ้งเตือน',
        },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // ✅ Get all notification types
  @UseGuards(JwtAuthGuard)
  @Get('getAllType')
  async getNotificationType() {
    try {
      const types = Object.values(NotificationType).map((type) => ({
        value: type,
        label: this.getTypeLabel(type), // ✅ Fixed typo: 'lable' -> 'label'
      }));

      return {
        success: true,
        data: types,
        message: 'ดึงประเภทการแจ้งเตือนสำเร็จ',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'เกิดข้อผิดพลาดในการดึงประเภทการแจ้งเตือน',
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ✅ Get notification by ID with proper authorization
  @UseGuards(JwtAuthGuard)
  @Get('getNotification/:id')
  async getNotificationById(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any
  ) {
    try {
      const userId = this.extractUserId(req);
      if (!userId) {
        throw new ForbiddenException('ไม่พบบัญชีผู้ใช้ กรุณาเข้าสู่ระบบใหม่');
      }

      const notification = await this.notiService.findNotificationById(id);

      if (!notification) {
        throw new HttpException(
          {
            success: false,
            message: 'ไม่พบการแจ้งเตือนที่ต้องการ',
          },
          HttpStatus.NOT_FOUND
        );
      }

      // ✅ Check permission to access
      if (notification.user_id !== userId) {
        const isSupporter = await this.notiService.isUserSupporter(userId);
        if (!isSupporter) {
          throw new ForbiddenException('ไม่มีสิทธิ์ในการเข้าถึงการแจ้งเตือนนี้');
        }
      }

      return {
        success: true,
        data: notification,
        message: 'ดึงข้อมูลการแจ้งเตือนสำเร็จ',
      };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลการแจ้งเตือน',
        },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Get('notification/:ticket_no')
  @UseGuards(JwtAuthGuard)
  async getTicketNotifications(
    @Param('ticket_no') ticketNo: string,
    @Req() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20'
  ) {
    const userId = this.extractUserId(req);
    if (!userId) throw new ForbiddenException('ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่');

    const userPermissions: number[] = await this.ticketService.checkUserPermissions(userId);
    console.log('User permission:', userPermissions)

    const canAccess = await this.canAccessTicketByNo(userId, ticketNo, userPermissions);
    if (!canAccess) throw new ForbiddenException('ไม่มีสิทธิ์ในการดูการแจ้งเตือนของตั๋วนี้');

    const pageNumber = Math.max(1, parseInt(page) || 1);
    const limitNumber = Math.min(100, Math.max(1, parseInt(limit) || 20));

    const result = await this.notiService.getTicketNotifications(ticketNo, pageNumber, limitNumber);

    return {
      success: true,
      data: result,
      message: 'ดึงข้อมูลการแจ้งเตือนของ ticket สำเร็จ',
    };
  }

  // ✅ Fixed: Mark single notification as read (was calling markAllAsRead)
  @UseGuards(JwtAuthGuard)
  @Put('markAsRead/:id')
  async markAsRead(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    try {
      const userId = this.extractUserId(req);
      if (!userId) {
        throw new ForbiddenException('ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่');
      }

      // ✅ Fixed: Call markAsRead instead of markAllAsRead
      const result = await this.notiService.markAsRead(id, userId);

      return {
        success: true,
        data: result,
        message: 'ทำเครื่องหมายอ่านแล้วสำเร็จ',
      };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: error.message || 'เกิดข้อผิดพลาดในการทำเครื่องหมายว่าอ่านแล้ว',
        },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  // ✅ Mark all notifications as read
  @UseGuards(JwtAuthGuard)
  @Put('notification/read-all')
  async markAllRead(@Req() req: any) {
    try {
      const userId = this.extractUserId(req);
      if (!userId) {
        throw new ForbiddenException('ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่');
      }

      const result = await this.notiService.markAllAsRead(userId);

      return {
        success: true,
        data: {
          update_count: result.updated,
          user_id: userId,
        },
        message: `ทำเครื่องหมายว่าอ่านแล้ว ${result.updated} รายการ`,
      };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: error.message || 'เกิดข้อผิดพลาดในการทำเครื่องหมายอ่านแล้ว',
        },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  private getTypeLabel(type: NotificationType): string {
    const labels: Record<NotificationType, string> = {
      [NotificationType.NEW_TICKET]: 'ตั๋วใหม่',
      [NotificationType.STATUS_CHANGE]: 'การเปลี่ยนสถานะ',
      [NotificationType.ASSIGNMENT]: 'การมอบหมาย',
    };

    return labels[type] || 'ไม่ทราบประเภท';
  }
}
