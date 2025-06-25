import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards,
  ParseIntPipe,
  Request
 } from '@nestjs/common';
import { TicketStatusService } from './ticket_status.service';
import { CreateTicketStatusDto } from './dto/create-ticket_status.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket_status.dto';
import { JwtAuthGuard } from 'src/auth/jwt_auth.guard';

@Controller('api')
export class TicketStatusController {
  constructor(private readonly statusService: TicketStatusService) {}

  // @UseGuards(JwtAuthGuard)
  // @Post('status')
  // async status(@Body() body: { language_id?: string }) {
  //   console.log('Controller received body:', body); // Debug log
  //   return this.statusService.status(body?.language_id);
  // }

  @UseGuards(JwtAuthGuard)
  @Get('status')
  async getCategories() {
    return this.statusService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('status/:id')
  async getCategory(@Param('id', ParseIntPipe) id: number) {
    return this.statusService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('status')
  async createStatus(@Body() body: any, @Request() req) {
    console.log('=== DEBUG: Incoming Request ===');
    console.log('Raw body:', JSON.stringify(body, null, 2));
    console.log('statusLang value:', body.statusLang);
    console.log('statusLang type:', typeof body.statusLang);
    console.log('Is array:', Array.isArray(body.statusLang));
    console.log('Body keys:', Object.keys(body));
    console.log('==============================');

    const userId = req.user.id || req.user.sub || req.user.userId;
    body.create_by = userId;
    
    return this.statusService.createStatus(body);
  }

  @Get('ticketHistory/:id')
  @UseGuards(JwtAuthGuard)
  async getTicketHistory(@Param('id', ParseIntPipe) ticketId: number) {
    try {
      const history = await this.statusService.getTicketStatusHistory(ticketId);
      
      return {
        code: 1,
        message: 'Success',
        data: history,
      };
    } catch (error) {
      console.error('Error getting ticket history:', error);
      return {
        code: 2,
        message: error.message || 'Failed to get ticket history',
        data: null,
      };
    }
  }
}
