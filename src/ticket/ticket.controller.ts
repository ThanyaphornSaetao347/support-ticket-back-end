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
  Req,
  Delete,
  Patch,
  HttpStatus,
  HttpException,
  UseInterceptors,
  UploadedFiles,
  HttpCode
} from '@nestjs/common';
import { TicketService } from './ticket.service';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { JwtAuthGuard } from 'src/auth/jwt_auth.guard';
import { AttachmentService } from 'src/ticket_attachment/ticket_attachment.service';
import { TicketStatusService } from 'src/ticket_status/ticket_status.service';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CreateTicketAttachmentDto } from 'src/ticket_attachment/dto/create-ticket_attachment.dto';
import { data } from 'jquery';
import { CreateSatisfactionDto } from 'src/satisfaction/dto/create-satisfaction.dto';

@Controller('api')
export class TicketController {
  constructor(
    private readonly ticketService: TicketService,
    private readonly ticketStatusService: TicketStatusService,
  ){}
  
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

  // ✅ แก้ไข getTicketData ให้ใช้ ticket_no แทน ticket_id
  @Post('getTicketData')
  async getTicketData(@Body() body: { ticket_no: string }, @Req() req: any) {
    try {
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

      // ✅ ตรวจสอบ format (optional)
      if (!this.isValidTicketNoFormat(ticketNo)) {
        return {
          code: 2,
          message: 'รูปแบบ ticket_no ไม่ถูกต้อง (ต้องเป็น Txxxxxxxxx)',
          data: null,
        };
      }

      // ✅ ดึง baseUrl อัตโนมัติจาก Request
      const baseUrl = `${req.protocol}://${req.get('host')}`;

      // ✅ ใช้ method ใหม่ที่รับ ticket_no
      const data = await this.ticketService.getTicketData(ticketNo, baseUrl);

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
  @Post('saveSupporter/:ticket_no')
  @UseInterceptors(FilesInterceptor('attachments'))
  async saveSupporter(
    @Param('ticket_no') ticketNo: string,
    @Body() formData: any,
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req: any
  ){
    try {
      const result = await this.ticketService.saveSupporter(
        ticketNo,
        formData,
        files,
        req.user.id
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
    const userId = req.user.user_id
    return await this.ticketService.getAllMAsterFilter(userId)
  }

  // ✅ Specific ticket routes (with "ticket" prefix) come BEFORE generic :id route
  @Get('tickets/:ticket_no')
  @UseGuards(JwtAuthGuard)
  async getTicketByNo(@Param('ticket_no') ticket_no: string, @Req() req: any) {
    try {
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
  async getTicket(@Param('id', ParseIntPipe) id: number) {
    return this.ticketService.findTicketById(id);
  }

  // ✅ Helper methods
  private isValidTicketNoFormat(ticketNo: string): boolean {
    // Format: T + 9 digits (T250660062)
    const ticketPattern = /^T\d{9}$/;
    return ticketPattern.test(ticketNo);
  }

  private extractUserId(req: any): number {
    return req.user?.id || req.user?.userId || req.user?.user_id || req.user?.sub;
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
      const result = await this.ticketService.saveSatisfaction(
        ticketNo,
        createSatisfactionDto,
        req.user?.id
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
}