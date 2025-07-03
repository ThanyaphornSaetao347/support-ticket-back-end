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
  NotFoundException
} from '@nestjs/common';
import { TicketService } from './ticket.service';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { JwtAuthGuard } from 'src/auth/jwt_auth.guard';
import { TicketStatusService } from 'src/ticket_status/ticket_status.service';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CreateSatisfactionDto } from 'src/satisfaction/dto/create-satisfaction.dto';


@Controller('api')
export class TicketController {
  constructor(
    private readonly ticketService: TicketService,
    private readonly ticketStatusService: TicketStatusService,
    private readonly ststusService: TicketStatusService,
  ){}

  private readonly PERMISSIONS = {
    CREATE_TICKET: 1,          // แจ้งปัญหา
    TRACK_TICKET: 2,           // ติดตามปัญหา
    EDIT_TICKET: 3,            // แก้ไข ticket
    DELETE_TICKET: 4,          // ลบ ticket
    CHANGE_STATUS: 5,          // เปลี่ยนสถานะของ ticket
    REPLY_TICKET: 6,           // ตอบกลับ ticket
    CLOSE_TICKET: 7,           // ปิด ticket
    SOLVE_PROBLEM: 8,          // แก้ไขปัญหา
    ASSIGNEE: 9,               // ผู้รับเรื่อง
    OPEN_TICKET: 10,           // เปิด ticket
    RESTORE_TICKET: 11,        // กู้คืน ticket
    VIEW_OWN_TICKETS: 12,       // ✅ ดูตั๋วทั้งหมดที่ตัวเองสร้าง
    VIEW_ALL_TICKETS: 13,
    SATISFACTION: 14,
  };

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

  // ฟังก์ชันตรวจสอบสิทธิ์ (ใช้ ticketService ที่มีอยู่แล้ว)
  private async checkPermission(userId: number, permissions: number[]): Promise<boolean> {
    if (!userId) return false;
    
    try {
      const userPermissions: number[] = await this.ticketService.checkUserPermissions(userId); // [1, 2, 3]

      if (!userPermissions || !userPermissions.length) return false;

      return permissions.every(permission => userPermissions.includes(permission));
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }

  // ✅ เพิ่มฟังก์ชันตรวจสอบว่าเป็นเจ้าของตั๋วหรือไม่
  private async isTicketOwner(userId: number, ticketId: number): Promise<boolean> {
    try {
      // ตรวจสอบว่า user นี้เป็นคนสร้างตั๋วหรือไม่
      const result = await this.ticketService.checkTicketOwnership(userId, ticketId);
      return result && result.length > 0;
    } catch (error) {
      console.error('Error checking ticket ownership:', error);
      return false;
    }
  }

  private async isTicketOwnerByNo(userId: number, ticketNo: string): Promise<boolean> {
    try {
      console.log('👤 === isTicketOwnerByNo Debug ===');
      console.log('Input parameters:', { userId, ticketNo });
      
      // ✅ ตรวจสอบ parameters
      if (!userId || !ticketNo) {
        console.log('❌ Invalid parameters in isTicketOwnerByNo');
        return false;
      }

      // ✅ เรียก service method
      const result = await this.ticketService.checkTicketOwnershipByNo(userId, ticketNo);
      console.log('Service result:', result);
      
      const isOwner = result && result.length > 0;
      console.log('Final ownership result:', isOwner);
      
      return isOwner;
    } catch (error) {
      console.error('💥 Error in isTicketOwnerByNo:', error);
      return false;
    }
  }

  // ✅ ปรับปรุงฟังก์ชันตรวจสอบสิทธิ์ให้รองรับ owner
  private async canAccessTicket(userId: number, ticketId: number): Promise<boolean> {
    // 1. ตรวจสอบสิทธิ์ทั่วไป (TRACK_TICKET)
    const hasGeneralPermission = await this.checkPermission(userId, [this.PERMISSIONS.TRACK_TICKET]);
    if (hasGeneralPermission) {
      return true;
    }

    // 2. ถ้าไม่มีสิทธิ์ทั่วไป ให้ตรวจสอบว่าเป็นเจ้าของตั๋วหรือไม่
    const isOwner = await this.isTicketOwner(userId, ticketId);
    if (isOwner) {
      console.log(`✅ User ${userId} is owner of ticket ${ticketId}`);
      return true;
    }

    return false;
  }

  // ✅ ปรับปรุง canAccessTicketByNo ให้ debug parameter
  private async canAccessTicketByNo(userId: number, ticketNo: string): Promise<boolean> {
    try {
      console.log('🔐 === canAccessTicketByNo Debug ===');
      console.log('Input parameters:', { userId, ticketNo });
      console.log('userId type:', typeof userId);
      console.log('ticketNo type:', typeof ticketNo);
      
      // ✅ ตรวจสอบ parameters อย่างละเอียด
      if (userId === undefined || userId === null) {
        console.log('❌ userId is undefined or null');
        return false;
      }
      
      if (!ticketNo || ticketNo.trim() === '') {
        console.log('❌ ticketNo is empty or null');
        return false;
      }

      // ✅ แปลงเป็น number ถ้าจำเป็น
      const numericUserId = typeof userId === 'string' ? parseInt(userId) : userId;
      
      if (isNaN(numericUserId)) {
        console.log('❌ userId is not a valid number:', userId);
        return false;
      }

      console.log('✅ Parameters validated. Checking permissions...');

      // 1. ตรวจสอบสิทธิ์ทั่วไป
      console.log('🔍 Checking general permissions...');
      const hasGeneralPermission = await this.checkPermission(numericUserId, [this.PERMISSIONS.TRACK_TICKET]);
      console.log('📋 General permission result:', hasGeneralPermission);
      
      if (hasGeneralPermission) {
        console.log('✅ User has general TRACK_TICKET permission');
        return true;
      }

      // 2. ตรวจสอบเจ้าของตั๋ว
      console.log('🔍 Checking ticket ownership...');
      const isOwner = await this.isTicketOwnerByNo(numericUserId, ticketNo);
      console.log('👤 Ownership result:', isOwner);
      
      if (isOwner) {
        console.log('✅ User is owner of the ticket');
        return true;
      }

      console.log('❌ User has no access to the ticket');
      return false;
    } catch (error) {
      console.error('💥 Error in canAccessTicketByNo:', error);
      return false;
    }
  }

  // ✅ ฟังก์ชันตรวจสอบสิทธิ์สำหรับการแก้ไข
  private async canEditTicket(userId: number, ticketNo: string): Promise<boolean> {
    // 1. ตรวจสอบสิทธิ์ทั่วไป (EDIT_TICKET)
    const hasEditPermission = await this.checkPermission(userId, [this.PERMISSIONS.EDIT_TICKET]);
    if (hasEditPermission) {
      return true;
    }

    // 2. ตรวจสอบเจ้าของตั๋ว
    const isOwner = await this.isTicketOwnerByNo(userId, ticketNo);
    if (isOwner) {
      console.log(`✅ User ${userId} can edit ticket ${ticketNo} as owner`);
      return true;
    }

    return false;
  }

  // ✅ ฟังก์ชันตรวจสอบสิทธิ์สำหรับการลบ
  private async canDeleteTicket(userId: number, ticketNo: string): Promise<boolean> {
    // 1. ตรวจสอบสิทธิ์ทั่วไป (DELETE_TICKET)
    const hasDeletePermission = await this.checkPermission(userId, [this.PERMISSIONS.DELETE_TICKET]);
    if (hasDeletePermission) {
      return true;
    }

    // 2. ตรวจสอบเจ้าของตั๋ว
    const isOwner = await this.isTicketOwnerByNo(userId, ticketNo);
    if (isOwner) {
      console.log(`✅ User ${userId} can delete ticket ${ticketNo} as owner`);
      return true;
    }

    return false;
  }
  
  @UseGuards(JwtAuthGuard)
  @Post('saveTicket')
  async saveTicket(@Body() dto: any, @Request() req: any): Promise<any> {
    console.log('Request body received:', dto);
    console.log('Request user object:', req.user);

    // Extract user ID
    let userId = null;
    if (req.user) {
      userId = req.user.id || req.user.sub || req.user.user_id || req.user.userId;
    }

    console.log('Extracted userId:', userId);

    if (!userId) {
      return {
        code: 2,
        message: 'User not authenticated properly',
        data: null,
      };
    }

    // ✅ เพิ่มการตรวจสอบสิทธิ์ CREATE_TICKET
    if (!await this.checkPermission(userId, [this.PERMISSIONS.CREATE_TICKET])) {
      throw new ForbiddenException('ไม่มีสิทธิ์ในการสร้างตั๋วปัญหา');
    }

    // Validate request body
    if (!dto) {
      return {
        code: 2,
        message: 'Request body is required',
        data: null,
      };
    }

    // Validate and transform data
    const transformedDto = {
      ticket_id: dto.ticket_id ? parseInt(dto.ticket_id) : undefined,
      project_id: parseInt(dto.project_id),
      categories_id: parseInt(dto.categories_id),
      issue_description: dto.issue_description,
      status_id: dto.status_id ? parseInt(dto.status_id) : 1,
      issue_attachment: dto.issue_attachment || null,
    };

    // Validate required fields after transformation
    if (isNaN(transformedDto.project_id)) {
      return {
        code: 2,
        message: 'project_id must be a valid number',
        data: null,
      };
    }

    if (isNaN(transformedDto.categories_id)) {
      return {
        code: 2,
        message: 'categories_id must be a valid number',
        data: null,
      };
    }

    if (!transformedDto.issue_description || transformedDto.issue_description.trim() === '') {
      return {
        code: 2,
        message: 'issue_description is required',
        data: null,
      };
    }

    try {
      const result = await this.ticketService.saveTicket(transformedDto, userId);
      return {
        code: 1,
        message: 'Success',
        ticket_id: result.ticket_id,
        ticket_no: result.ticket_no
      };
    } catch (error) {
      console.error('Error in saveTicket:', error);
      return {
        code: 2,
        message: error.message || 'เกิดข้อผิดพลาด',
        data: null,
      };
    }
  }

  // ✅ แก้ไข getTicketData ให้ใช้ ticket_no แทน ticket_id
  @UseGuards(JwtAuthGuard)
  @Post('getTicketData')
  async getTicketData(@Body() body: { ticket_no: string }, @Req() req: any) {
    try {
      console.log('🎫 === getTicketData Debug Start ===');
      
      // ✅ Debug user object ก่อน
      this.debugUserObject(req);
      
      // ✅ Extract userId พร้อม debug
      const userId = this.extractUserId(req);
      console.log('Final extracted userId:', userId);
      
      // ✅ ตรวจสอบว่า userId มีค่าหรือไม่
      if (!userId) {
        console.log('❌ No userId found, returning error');
        return {
          code: 2,
          message: 'ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่',
          data: null,
        };
      }
      
      let ticketNo = body.ticket_no;
      
      if (!ticketNo) {
        return {
          code: 2,
          message: 'กรุณาส่ง ticket_no',
          data: null,
        };
      }

      // ✅ Normalize ticket_no
      ticketNo = ticketNo.toString().trim().toUpperCase();
      if (!ticketNo.startsWith('T')) {
        ticketNo = 'T' + ticketNo;
      }
      
      console.log('Processing ticket:', ticketNo, 'for user:', userId);

      // ✅ ตรวจสอบ format
      if (!this.isValidTicketNoFormat(ticketNo)) {
        return {
          code: 2,
          message: 'รูปแบบ ticket_no ไม่ถูกต้อง (ต้องเป็น Txxxxxxxxx)',
          data: null,
        };
      }

      // ✅ ตรวจสอบการเข้าถึง พร้อม debug
      console.log('🔐 Checking access for userId:', userId, 'ticketNo:', ticketNo);
      const canAccess = await this.canAccessTicketByNo(userId, ticketNo);
      console.log('Access result:', canAccess);
      
      if (!canAccess) {
        return {
          code: 2,
          message: 'ไม่มีสิทธิ์ในการดูตั๋วปัญหานี้',
          data: null,
        };
      }

      // ✅ ดึงข้อมูลตั๋ว
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const data = await this.ticketService.getTicketData(ticketNo, baseUrl);

      console.log('🎫 === getTicketData Success ===');
      return {
        code: 1,
        message: 'Success',
        data,
      };
    } catch (error) {
      console.error('💥 Error in getTicketData:', error);
      
      if (error instanceof ForbiddenException) {
        return {
          code: 2,
          message: error.message,
          data: null,
        };
      }
      
      return {
        code: 2,
        message: error.message || 'เกิดข้อผิดพลาด',
        data: null,
      };
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

      const canViewAll = await this.checkPermission(userId, [this.PERMISSIONS.VIEW_ALL_TICKETS]);
      const canViewOwn = await this.checkPermission(userId, [this.PERMISSIONS.VIEW_OWN_TICKETS]);

      if (!canViewAll && !canViewOwn) {
        throw new ForbiddenException('ไม่มีสิทธิ์ในการดูรายการตั๋ว');
      }

      let tickets;
      if (canViewAll) {
        tickets = await this.ticketService.getAllTicketWithoutFilter();
      } else {
        tickets = await this.ticketService.getTicketsByCreator(userId); // เฉพาะของตัวเอง
      }

      return {
        success: true,
        data: tickets,
        debug: {
          userId: userId,
          ticketCount: tickets.length,
          permission: canViewAll ? 'VIEW_ALL' : 'VIEW_OWN'
        }
      };
    } catch (error) {
      console.error('Error in getAllTicket:', error);
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
  ){
    try {
      const userId = req.user.id;

      // ✅ เพิ่มการตรวจสอบสิทธิ์ SOLVE_PROBLEM
      if (!await this.checkPermission(userId, [this.PERMISSIONS.SOLVE_PROBLEM])) {
        throw new ForbiddenException('ไม่มีสิทธิ์ในการแก้ไขปัญหา');
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
  async getAllMAsterFilter(@Req() req) {
    // ✅ เพิ่มการตรวจสอบสิทธิ์ TRACK_TICKET
    const userId = req.user.user_id;
    if (!await this.checkPermission(userId, [this.PERMISSIONS.TRACK_TICKET])) {
      throw new ForbiddenException('ไม่มีสิทธิ์ในการดูข้อมูล');
    }

    return await this.ticketService.getAllMAsterFilter(userId);
  }

  // ✅ Specific ticket routes (with "ticket" prefix) come BEFORE generic :id route
  @Get('tickets/:ticket_no')
  @UseGuards(JwtAuthGuard)
  async getTicketByNo(@Param('ticket_no') ticket_no: string, @Req() req: any) {
    try {
      // ✅ เพิ่มการตรวจสอบสิทธิ์ TRACK_TICKET
      const userId = this.extractUserId(req);
      if (!await this.checkPermission(userId!, [this.PERMISSIONS.TRACK_TICKET])) {
        throw new ForbiddenException('ไม่มีสิทธิ์ในการดูตั๋วปัญหา');
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const data = await this.ticketService.getTicketData(ticket_no, baseUrl);

      return {
        code: 1,
        message: 'Success',
        data,
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

      // ✅ เพิ่มการตรวจสอบสิทธิ์ EDIT_TICKET
      if (!await this.checkPermission(userId, [this.PERMISSIONS.EDIT_TICKET])) {
        throw new ForbiddenException('ไม่มีสิทธิ์ในการแก้ไขตั๋วปัญหา');
      }

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
      console.log(`🔄 Updating ticket ${ticketId} status to ${body.status_id}`);

      const userId = this.extractUserId(req);
      if (!userId) {
        throw new HttpException('User not authenticated properly', HttpStatus.UNAUTHORIZED);
      }

      // ✅ เพิ่มการตรวจสอบสิทธิ์ CHANGE_STATUS
      if (!await this.checkPermission(userId, [this.PERMISSIONS.CHANGE_STATUS])) {
        throw new ForbiddenException('ไม่มีสิทธิ์ในการเปลี่ยนสถานะตั๋วปัญหา');
      }

      // ✅ Validate input
      if (!body.status_id || isNaN(body.status_id)) {
        return {
          code: 2,
          message: 'status_id must be a valid number',
          data: null,
        };
      }

      // ✅ เปลี่ยนจาก updateTicketStatus เป็น updateTicketStatusAndHistory
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

  @Delete('tickets/:ticket_no')
  @UseGuards(JwtAuthGuard)
  async deleteTicketByNo(
    @Param('ticket_no') ticket_no: string,
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

      // ✅ เพิ่มการตรวจสอบสิทธิ์ DELETE_TICKET
      if (!await this.checkPermission(userId, [this.PERMISSIONS.DELETE_TICKET])) {
        throw new ForbiddenException('ไม่มีสิทธิ์ในการลบตั๋วปัญหา');
      }

      await this.ticketService.softDeleteTicket(ticket_no, userId);

      return {
        code: 1,
        message: 'Ticket deleted successfully',
        data: null,
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

  @Post('tickets/restore/:ticket_no')
  @UseGuards(JwtAuthGuard)
  async restoreTicketByNo(
    @Param('ticket_no') ticket_no: string,
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

      // ✅ เพิ่มการตรวจสอบสิทธิ์ RESTORE_TICKET
      if (!await this.checkPermission(userId, [this.PERMISSIONS.RESTORE_TICKET])) {
        throw new ForbiddenException('ไม่มีสิทธิ์ในการกู้คืนตั๋วปัญหา');
      }

      await this.ticketService.restoreTicketByNo(ticket_no, userId);

      return {
        code: 1,
        message: 'Ticket restored successfully',
        data: null,
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

  // ✅ Generic :id route comes LAST to avoid conflicts
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getTicket(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    // ✅ เพิ่มการตรวจสอบสิทธิ์ TRACK_TICKET
    const userId = this.extractUserId(req);
    if (!await this.checkPermission(userId!, [this.PERMISSIONS.TRACK_TICKET])) {
      throw new ForbiddenException('ไม่มีสิทธิ์ในการดูตั๋วปัญหา');
    }

    return this.ticketService.findTicketById(id);
  }

  // rating from user
  @Post('saveSatisfaction/:ticket_no')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async saveSatisfaction(
    @Param('ticket_no') ticketNo: string,
    @Body() createSatisfactionDto: CreateSatisfactionDto,
    @Request() req: any
  ) {
    try {
      const userId = req.user?.id;

      // ✅ เพิ่มการตรวจสอบสิทธิ์ TRACK_TICKET (ให้ user ที่มีสิทธิ์ดูตั๋วสามารถให้คะแนนได้)
      if (!await this.checkPermission(userId, [this.PERMISSIONS.TRACK_TICKET])) {
        throw new ForbiddenException('ไม่มีสิทธิ์ในการประเมินความพึงพอใจ');
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
  async checkSpecificPermission(@Body() body: { permissions: number[] }, @Request() req: any) {
    try {
      const userId = this.extractUserId(req);
      const hasPermission = await this.checkPermission(userId!, body.permissions);
      
      return {
        success: true,
        data: {
          user_id: userId,
          has_permission: hasPermission,
          required_permissions: body.permissions
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

  // ✅ ปรับปรุง getTicketStatus
  @UseGuards(JwtAuthGuard)
  @Get(':id/status')
  async getTicketStatus(
    @Param('id', ParseIntPipe) ticketId: number,
    @Req() req: any
  ) {
    try {
      // ✅ ตรวจสอบสิทธิ์ก่อน
      const userId = this.extractUserId(req);
      if (!await this.checkPermission(userId!, [this.PERMISSIONS.TRACK_TICKET])) {
        throw new ForbiddenException('ไม่มีสิทธิ์ในการดูสถานะตั๋วปัญหา');
      }

      // ✅ ตรวจจับภาษา
      const languageId = this.getLanguage(req);
      
      // ✅ Log ข้อมูล request
      this.logRequestInfo(req, {
        ticketId,
        detectedLanguage: languageId,
        userId
      });

      console.log(`🎫 Getting status for ticket ${ticketId}, language: ${languageId}`);

      // ✅ ดึงข้อมูลสถานะ
      const ticketStatus = await this.ticketStatusService.getTicketStatusWithName(
        ticketId,
        languageId
      );

      if (!ticketStatus) {
        throw new NotFoundException(`ไม่พบตั๋วปัญหา ID: ${ticketId}`);
      }

      // ✅ ส่งข้อมูลกลับพร้อมข้อมูลเพิ่มเติม
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
      
      if (error instanceof ForbiddenException || error instanceof NotFoundException) {
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
}