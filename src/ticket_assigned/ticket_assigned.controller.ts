import { Controller, Request, Get, Post, Body, Patch, Param, Delete, Put, UseGuards, ForbiddenException } from '@nestjs/common';
import { TicketAssignedService } from './ticket_assigned.service';
import { CreateTicketAssignedDto } from './dto/create-ticket_assigned.dto';
import { UpdateTicketAssignedDto } from './dto/update-ticket_assigned.dto';
import { JwtAuthGuard } from '../auth/jwt_auth.guard';
import { UserAllowRole } from '../user_allow_role/entities/user_allow_role.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RequireAction } from '../permission/permission.decorator';
import { PermissionGuard } from '../permission/permission.guard';

@Controller('api')
export class TicketAssignedController {
  constructor(
    private readonly ticketAssignedService: TicketAssignedService,

    @InjectRepository(UserAllowRole)
    private readonly userAllowRoleRepo: Repository<UserAllowRole>,
  ) {}

  // Controller Methods
  @Get('tickets/assign/users/role9')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAction('assign_ticket')
  async getRole9Users() {
    return this.ticketAssignedService.getRole9Users();
  }

  @Post('tickets/assign/:ticket_no')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAction('assign_ticket')
  async assignTicket(
    @Param('ticket_no') ticketNo: string,
    @Body('assignedTo') assignedTo: number,
    @Request() req: any
  ) {
<<<<<<< HEAD
    const assignedBy = req.user.id;

    return this.ticketAssignedService.assignTicketByTicketNo(
      ticketNo,
      assignedTo,
      assignedBy // ส่งแค่ userId ให้ service ดึง permissions เอง
    );
=======
    return this.ticketAssignedService.assignTicketByTicketNo(
      ticketNo,
      assignedTo,
      req.user.id
    );
  }

  @Get('tickets/assign/users')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAction('assign_ticket')
  async getAssignableUsers() {
    return this.ticketAssignedService.getUserAssignTo();
>>>>>>> c800e6ccbbccb4c37b12cb33ae2e84d31ad3f529
  }
}
