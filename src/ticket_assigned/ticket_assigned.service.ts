import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateTicketAssignedDto } from './dto/create-ticket_assigned.dto';
import { UpdateTicketAssignedDto } from './dto/update-ticket_assigned.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Ticket } from '../ticket/entities/ticket.entity';
import { Repository } from 'typeorm';
import { TicketAssigned } from './entities/ticket_assigned.entity';
import { Users } from '../users/entities/user.entity';
import { NotificationService } from '../notification/notification.service';
import { PermissionService } from '../permission/permission.service';

@Injectable()
export class TicketAssignedService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,

    @InjectRepository(TicketAssigned)
    private readonly assignRepo: Repository<TicketAssigned>,

    @InjectRepository(Users)
    private readonly userRepo: Repository<Users>,

    private readonly notiService: NotificationService,
    private readonly permissionService: PermissionService,
  ){}

  async getUserAssignTo(): Promise<Users[]> {
    // ดึงรายชื่อผู้ใช้ที่มี role_id = 9 (หรือเปลี่ยนได้ตาม requirement)
    return await this.permissionService.getUsersByRole(9);
  }

  async assignTicketByTicketNo(
    ticketNo: string,
    assignedTo: number,
    assignedBy: number,
  ) {
    // 1. ตรวจสอบว่า user ที่มอบหมายมี role_id = 19 หรือไม่
    const hasAssignRole = await this.permissionService.canAssignTicket(assignedBy);
    if (!hasAssignRole) {
      throw new ForbiddenException('ไม่มีสิทธิ์ในการมอบหมายงาน');
    }

    // 2. ตรวจสอบ ticket
    const ticket = await this.ticketRepo.findOne({ where: { ticket_no: ticketNo } });
    if (!ticket) {
      throw new NotFoundException(`ไม่พบ Ticket หมายเลข ${ticketNo}`);
    }

    // 3. ตรวจสอบผู้รับมอบหมาย
    const assignee = await this.userRepo.findOne({ where: { id: assignedTo } });
    if (!assignee) {
      throw new BadRequestException('ไม่พบผู้รับมอบหมาย');
    }

    const alreadyAssigned = await this.assignRepo.findOne({
      where: { ticket_id: ticket.id, user_id: assignedTo },
    });
    if (alreadyAssigned) {
      throw new BadRequestException('Ticket นี้ถูกมอบหมายให้ผู้ใช้นี้แล้ว');
    }

    // 4. ทำการมอบหมาย
    const assigned = this.assignRepo.create({
      ticket_id: ticket.id,
      user_id: assignedTo,
      create_date: new Date(),
      create_by: assignedBy,
    });
    await this.assignRepo.save(assigned);

    // 5. ดึงรายชื่อผู้ที่มี role_id = 9
    const role9Users = await this.permissionService.getUsersByRole(9);
    const role9UserNames = role9Users.map(
      (u) => `${u.firstname || ''} ${u.lastname || ''}`.trim(),
    );

    // 6. ส่ง Notification (ไม่ให้ error กระทบ main operation)
    try {
      console.log(`📧 Sending assignment notification for ticket ${ticket.id} to user ${assignedTo}`);
      await this.notiService.createAssignmentNotification(ticket.id.toString(), assignedTo);
      console.log(`✅ Assignment notification sent successfully`);
    } catch (notificationError) {
      console.error('❌ Failed to send assignment notification:', notificationError);
    }

    // 7. ส่งข้อมูลกลับ
    return {
      message: 'มอบหมายงานสำเร็จ',
      ticket_no: ticketNo,
      assigned_to: assignedTo,
      username: role9UserNames, // รายชื่อผู้ที่มี role_id = 9
    };
  }

}
