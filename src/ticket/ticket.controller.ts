import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  ParseIntPipe,
  UseGuards,
  Request,
  BadRequestException,
  Query,
  Req
} from '@nestjs/common';
import { TicketService } from './ticket.service';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { JwtAuthGuard } from 'src/auth/jwt_auth.guard';
import { AttachmentService } from 'src/ticket_attachment/ticket_attachment.service';

@Controller('api')
export class TicketController {
  constructor(
    private readonly ticketService: TicketService,
    private readonly attachmentService: AttachmentService,
  ) {}
  
  // แก้ไข saveTicket method ใน TicketController
  @UseGuards(JwtAuthGuard)
  @Post('saveTicket')
  async saveTicket(@Body() dto: any, @Request() req: any): Promise<any> {
    console.log('Request body received:', dto); // Debug log
    console.log('Request user object:', req.user); // Debug log

    // Validate request body
    if (!dto) {
      return {
        code: 2,
        message: 'Request body is required',
        data: null,
      };
    }

    // Extract user ID
    let userId = null;
    if (req.user) {
      userId = req.user.id || req.user.sub || req.user.user_id || req.user.userId;
    }

    console.log('Extracted userId:', userId); // Debug log

    if (!userId) {
      return {
        code: 2,
        message: 'User not authenticated properly',
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

  @Post('getTicketData')
  async getTicketData(@Body() body: { ticket_id: number }, @Req() req: any) {
    try {
      const ticketId = body.ticket_id;
      if (!ticketId) {
        return {
          code: 2,
          message: 'กรุณาส่ง ticket_id',
          data: null,
        };
      }

      // ✅ ดึง baseUrl อัตโนมัติจาก Request
      const baseUrl = `${req.protocol}://${req.get('host')}`;

      const data = await this.ticketService.getTicketData(ticketId, baseUrl);

      return {
        code: 1,
        message: 'Success',
        data,
      };
    } catch (error) {
      console.error('Error:', error.message);
      return {
        code: 2,
        message: 'เกิดข้อผิดพลาด',
        data: null,
      };
    }
  }

  @Post('getAllTicket')
  @UseGuards(JwtAuthGuard)
  async getAllTicket(@Request() req: any) {
    try {
      console.log('=== DEBUG getAllTicket ===');
      console.log('req.user:', JSON.stringify(req.user, null, 2));
      
      const userId = req.user?.id || req.user?.userId || req.user?.user_id || req.user?.sub;
      console.log('Extracted userId:', userId);
      
      if (!userId) {
        return {
          success: false,
          message: 'User ID not found in token'
        };
      }
      
      const tickets = await this.ticketService.getAllTicket(userId);
      console.log('Found tickets count:', tickets.length);
      
      return {
        success: true,
        data: tickets,
        debug: {
          userId: userId,
          ticketCount: tickets.length
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
  @Post('getAllMasterFilter')
  async getAllMAsterFilter(@Req() req) {
    const userId = req.user.user_id
    return await this.ticketService.getAllMAsterFilter(userId)
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getTicket(@Param('id', ParseIntPipe) id: number) {
    return this.ticketService.findTicketById(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateTicket(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTicketDto,
    @Request() req,
  ) {
    console.log('Update request user object:', req.user); // Debug log
    
    // ลองหลายวิธีในการเข้าถึง user ID
    let userId = null;
    if (req.user) {
      userId = req.user.id || req.user.sub || req.user.user_id || req.user.userId;
    }

    console.log('Update extracted userId:', userId); // Debug log
    
    if (!userId) {
      throw new BadRequestException('User not authenticated properly');
    }
    
    dto.update_by = userId;
    
    return this.ticketService.updateTicket(id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getMyTickets(@Request() req, @Query('with_attachments') withAttachments?: string) {
    console.log('GetMyTickets request user object:', req.user); // Debug log
    
    // ลองหลายวิธีในการเข้าถึง user ID
    let userId = null;
    if (req.user) {
      userId = req.user.id || req.user.sub || req.user.user_id || req.user.userId;
    }

    console.log('GetMyTickets extracted userId:', userId); // Debug log
    
    if (!userId) {
      throw new BadRequestException('User not authenticated properly');
    }
    
    if (withAttachments === 'true') {
      return this.ticketService.getTicketsWithAttachmentsByUserId(userId);
    }
    
    return this.ticketService.getTicketsByUserId(userId);
  }
}