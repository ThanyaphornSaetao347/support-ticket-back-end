import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource,Repository } from 'typeorm';
import { Ticket } from './entities/ticket.entity';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketStatusHistory } from '../ticket_status_history/entities/ticket_status_history.entity';
import { TicketAttachment } from '../ticket_attachment/entities/ticket_attachment.entity';
import { TicketCategory } from '../ticket_categories/entities/ticket_category.entity';
import { AttachmentService } from '../ticket_attachment/ticket_attachment.service';
import { TicketStatus } from '../ticket_status/entities/ticket_status.entity';
import { TicketStatusHistoryService } from '../ticket_status_history/ticket_status_history.service';
import { CreateSatisfactionDto } from '../satisfaction/dto/create-satisfaction.dto';
import { Satisfaction } from '../satisfaction/entities/satisfaction.entity';
import { NotificationService } from '../notification/notification.service';
import { Users } from '../users/entities/user.entity';
import { TicketAssigned } from '../ticket_assigned/entities/ticket_assigned.entity';
import { Project } from '../project/entities/project.entity';
import { PermissionService } from '../permission/permission.service';
import { CategoryStatsDTO } from './dto/dashboard.dto';

@Injectable()
export class TicketService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(TicketStatusHistory)
    private readonly historyRepo: Repository<TicketStatusHistory>,
    private readonly historyService: TicketStatusHistoryService,
    @InjectRepository(TicketAttachment)
    private readonly attachmentRepo: Repository<TicketAttachment>,
    private readonly attachmentService: AttachmentService,
    @InjectRepository(TicketCategory)
    private readonly categoryRepo: Repository<TicketCategory>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly dataSource: DataSource,
    @InjectRepository(TicketStatus)
    private readonly statusRepo: Repository<TicketStatus>,
    @InjectRepository(Satisfaction)
    private readonly satisfactionRepo: Repository<Satisfaction>,
    @InjectRepository(Users)
    private readonly userRepo: Repository<Users>,
    @InjectRepository(TicketAssigned)
    private readonly assignRepo: Repository<TicketAssigned>,

    private readonly notiService: NotificationService,
    private readonly permissionService: PermissionService,
  ) { }
  
  async getCategoryBreakdown(
    year: number,
    userId?: number
  ): Promise<CategoryStatsDTO[]> {
    // Query เดียว ดึง count ของทุก category แยกตามเดือน
    let query = this.ticketRepo
      .createQueryBuilder('t')
      .leftJoin('ticket_categories', 'tc', 'tc.id = t.categories_id')
      .leftJoin(
        'ticket_categories_language',
        'tcl',
        'tcl.category_id = tc.id AND tcl.language_id = :lang',
        { lang: 'th' }
      )
      .select('tc.id', 'categoryId')
      .addSelect('tcl.name', 'categoryName')
      .addSelect('EXTRACT(MONTH FROM t.create_date)::int', 'month')
      .addSelect('COUNT(t.id)', 'count')
      .where('EXTRACT(YEAR FROM t.create_date) = :year', { year })
      .andWhere('tcl.name IS NOT NULL');

    if (userId) {
      // ใช้ LEFT JOIN แทน INNER JOIN เพื่อไม่ให้หาย record ถ้าไม่มี ticket_assigned
      query = query.leftJoin(
        'ticket_assigned',
        'ta',
        'ta.ticket_id = t.id AND ta.user_id = :userId',
        { userId }
      );
    }

    const rawData = await query
      .groupBy('tc.id')
      .addGroupBy('tcl.name')
      .addGroupBy('month')
      .getRawMany();

    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
      '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD'
    ];

    // Map สำหรับเก็บข้อมูลรวม
    const categoryMap: Record<string, CategoryStatsDTO> = {};

    for (const row of rawData) {
      const categoryId = row.categoryId;
      const categoryName = row.categoryName;
      const month = Number(row.month);
      const count = Number(row.count);

      if (!categoryMap[categoryId]) {
        categoryMap[categoryId] = {
          category: categoryName,
          monthlyCounts: Array(12).fill(0),
          count: 0,
          percentage: 0,
          color: colors[Object.keys(categoryMap).length % colors.length],
        };
      }

      categoryMap[categoryId].monthlyCounts[month - 1] = count;
    }

    // คำนวณ count และ percentage
    const totalTickets = Object.values(categoryMap)
      .reduce((sum, item) => sum + item.monthlyCounts.reduce((a, b) => a + b, 0), 0);

    for (const item of Object.values(categoryMap)) {
      item.count = item.monthlyCounts.reduce((a, b) => a + b, 0);
      item.percentage = totalTickets ? Math.round((item.count / totalTickets) * 100) : 0;
    }

    return Object.values(categoryMap);
  }

  // ✅ แก้ไข checkTicketOwnership สำหรับ PostgreSQL
  async checkTicketOwnership(userId: number, ticketId: number, userPermissions: number[]): Promise<boolean> {
    try {
      if (!userId || !ticketId) return false;

      // กำหนด role/permission ที่อนุญาตเข้าถึง
      const allowRoles = [2, 12, 13];

      // ถ้า user มี permission ใดใน allowRoles เลย ให้ผ่าน
      if (allowRoles.some(role => userPermissions.includes(role))) {
        return true;
      }

      // ตรวจสอบว่า user เป็นเจ้าของ ticket
      const query = `
        SELECT id, ticket_no, create_by
        FROM ticket t
        WHERE t.id = $1 AND t.create_by = $2 AND t.isenabled = true
      `;
      const result = await this.dataSource.query(query, [ticketId, userId]);

      return result.length > 0;
    } catch (error) {
      console.error('💥 Error in checkTicketOwnership:', error);
      return false;
    }
  }

  // ✅ แก้ไข checkTicketOwnershipByNo สำหรับ PostgreSQL
  async checkTicketOwnershipByNo(userId: number, ticketNo: string, userPermissions: number[]): Promise<boolean> {
    try {
      if (!userId || !ticketNo) return false;

      // กำหนด role/permission ที่อนุญาตเข้าถึง
      const allowRoles = [2, 12, 13];

      // ถ้า user มี permission ใดใน allowRoles เลย ให้ผ่าน
      if (allowRoles.some(role => userPermissions.includes(role))) {
        return true;
      }

      // ตรวจสอบว่า user เป็นเจ้าของ ticket
      const query = `
        SELECT id, ticket_no, create_by
        FROM ticket t
        WHERE t.id = $1 AND t.create_by = $2 AND t.isenabled = true
      `;
      const result = await this.dataSource.query(query, [ticketNo, userId]);

      return result.length > 0;
    } catch (error) {
      console.error('💥 Error in checkTicketOwnership:', error);
      return false;
    }
  }

  async createTicket(dto: any) {
    try {
      if (!dto.create_by || isNaN(dto.create_by)) {
        throw new BadRequestException('Valid create_by value is required');
      }
      const userId = dto.userId;

      // สร้าง ticket_no
      const ticketNo = await this.generateTicketNumber();

      let ticket_id;
      let status = false;

      if (dto.id) {
        const result = await this.ticketRepo.findOne({ where: { id: dto.id } });
        if (result) {
          ticket_id = result?.id;
          status = true;
        }
      } else {
        const ticket = this.ticketRepo.create({
          ticket_no: ticketNo ?? '',
          categories_id: dto.categories_id ?? '',
          project_id: dto.project_id ?? '',
          issue_description: dto.issue_description ?? '',
          create_date: new Date(),
          create_by: userId ?? '',
          update_date: new Date(),
          update_by: userId ?? '',
          isenabled: true,
        });

        // ⚠️ ปัญหาหลัก: ต้อง await การ save
        const savedTicket = await this.ticketRepo.save(ticket);
        ticket_id = savedTicket.id;
        status = true;
      }

      return {
        status: status,
        ticket_id,
        message: 'Ticket created successfully'
      };
    } catch (error) {
      console.error('Error in createTicket:', error);
      throw error;
    }
  }
  
  // Function สำหรับ ticket_no = (Running Format: T250500001 Format มาจาก YYMM00000 [ปี:2][เดือน:2][Running:00000])
  async generateTicketNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2); // YY
    const month = (now.getMonth() + 1).toString().padStart(2, '0'); // MM
    const prefix = `T${year}${month}`;

    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      try {
        // หา ticket ล่าสุดในเดือนนี้
        const latestTicket = await this.ticketRepo
          .createQueryBuilder('t')
          .where('t.ticket_no LIKE :prefix', { prefix: `${prefix}%` })
          .orderBy('t.ticket_no', 'DESC')
          .getOne();

        let running = 1;
        if (latestTicket) {
          const lastRunning = parseInt(latestTicket.ticket_no.slice(-5), 10);
          running = lastRunning + 1;
        }

        const ticketNo = `${prefix}${running.toString().padStart(5, '0')}`;

        // ตรวจสอบว่า ticket_no ซ้ำหรือไม่ (เผื่อกรณี race condition)
        const existingTicket = await this.ticketRepo.findOne({
          where: { ticket_no: ticketNo }
        });

        if (!existingTicket) {
          return ticketNo;
        }

        console.warn(`Duplicate ticket number detected: ${ticketNo}, retrying...`);
        attempts++;

        // รอสักครู่ก่อนลองใหม่
        await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 20));

      } catch (error) {
        console.error('Error generating ticket number:', error);
        attempts++;
      }
    }

    // ถ้าลองหลายครั้งแล้วยังไม่ได้ ใช้ timestamp เป็น fallback
    const timestamp = Date.now().toString().slice(-5);
    const fallbackTicketNo = `${prefix}${timestamp}`;

    console.warn(`Using fallback ticket number: ${fallbackTicketNo}`);
    return fallbackTicketNo;
  }

  async saveTicket(dto: any, userId: number): Promise<{ ticket_id: number, ticket_no: string }> {
    try {
      if (!dto) throw new BadRequestException('Request body is required');

      const now = new Date();
      let ticket;
      let shouldSaveStatusHistory = false;
      let oldStatusId = null;
      let newStatusId = dto.status_id || 1;

      if (dto.ticket_id) {
        // Update existing ticket
        ticket = await this.ticketRepo.findOne({ where: { id: dto.ticket_id } });
        if (!ticket) throw new BadRequestException('ไม่พบ ticket ที่ต้องการอัปเดต');

        oldStatusId = ticket.status_id;

        // อัปเดตข้อมูล ticket
        ticket.project_id = dto.project_id;
        ticket.categories_id = dto.categories_id;
        ticket.issue_description = dto.issue_description;
        ticket.status_id = newStatusId;  // อัปเดต status
        ticket.issue_attachment = dto.issue_attachment || ticket.issue_attachment;
        ticket.update_by = userId;
        ticket.update_date = now;

        await this.ticketRepo.save(ticket);

        if (oldStatusId !== newStatusId) {
          shouldSaveStatusHistory = true;
        }
      } else {
        // สร้าง ticket ใหม่
        const ticketNo = await this.generateTicketNumber();

        ticket = this.ticketRepo.create({
          ticket_no: ticketNo,
          project_id: dto.project_id,
          categories_id: dto.categories_id,
          issue_description: dto.issue_description,
          status_id: newStatusId, // กำหนดสถานะตั้งต้น
          create_by: userId,
          create_date: now,
          update_by: userId,
          update_date: now,
          isenabled: true, // ถ้าต้องการเปิดใช้งานทันที
        });

        ticket = await this.ticketRepo.save(ticket);
        shouldSaveStatusHistory = true;
      }

      // บันทึก status history เฉพาะเมื่อสถานะเปลี่ยนหรือใหม่
      if (shouldSaveStatusHistory) {
        // ตรวจสอบว่ามีสถานะนี้ใน history แล้วหรือยัง (ป้องกันซ้ำ)
        const existingHistory = await this.historyRepo.findOne({
          where: { ticket_id: ticket.id, status_id: newStatusId },
          order: { create_date: 'DESC' },
        });

        if (!existingHistory) {
          const newHistory = this.historyRepo.create({
            ticket_id: ticket.id,
            status_id: newStatusId,
            create_date: now,
            create_by: userId,
          });
          await this.historyRepo.save(newHistory);
        }
      }

      return {
        ticket_id: ticket.id,
        ticket_no: ticket.ticket_no,
      };
    } catch (error) {
      console.error('Error in saveTicket:', error);
      throw error;
    }
  }

  // ✅ เพิ่ม helper method สำหรับ normalize ticket_no
  private normalizeTicketNo(ticketIdentifier: string | number): string {
    let ticketNo = ticketIdentifier.toString().trim().toUpperCase();

    // ถ้าไม่มี T ให้เพิ่มให้
    if (!ticketNo.startsWith('T')) {
      ticketNo = 'T' + ticketNo;
    }

    return ticketNo;
  }

  // ✅ เพิ่ม method ใหม่ที่ใช้ ticket_no
  async getTicketData(ticket_no: string, baseUrl: string) {
    try {
      const attachmentPath = '/images/issue_attachment/';

      // ✅ Normalize ticket_no
      const normalizedTicketNo = this.normalizeTicketNo(ticket_no);

      // ✅ Query ข้อมูลหลัก Ticket
      const ticket = await this.ticketRepo
        .createQueryBuilder('t')
        .leftJoin('ticket_categories_language', 'tcl', 'tcl.category_id = t.categories_id AND tcl.language_id = :lang', { lang: 'th' })
        .leftJoin('project', 'p', 'p.id = t.project_id')
        .leftJoin('users', 'uc', 'uc.id = t.create_by')
        .leftJoin('users', 'uu', 'uu.id = t.update_by')
        .leftJoin('ticket_status', 'ts', 'ts.id = t.status_id')
        .leftJoin('ticket_status_language', 'tsl', 'tsl.status_id = ts.id AND tsl.language_id = :lang', { lang: 'th' })
        .select([
          't.id AS id',
          't.ticket_no AS ticket_no',
          't.categories_id AS categories_id',
          't.project_id AS project_id',
          't.issue_description AS issue_description',
          't.fix_issue_description AS fix_issue_description',
          't.status_id AS status_id',
          't.close_estimate AS close_estimate',
          't.estimate_time AS estimate_time',
          't.due_date AS due_date',
          't.lead_time AS lead_time',
          't.related_ticket_id AS related_ticket_id',
          't.change_request AS change_request',
          't.create_date AS create_date',
          't.update_date AS update_date',
          't.isenabled AS isenabled',
          'tcl.name AS categories_name',
          'p.name AS project_name',
          'tsl.name AS status_name',
          `uc.firstname || ' ' || uc.lastname AS create_by`,
          `uu.firstname || ' ' || uu.lastname AS update_by`,
        ])
        .where('UPPER(t.ticket_no) = UPPER(:ticket_no)', { ticket_no: normalizedTicketNo })
        .andWhere('t.isenabled = true')
        .getRawOne();

      if (!ticket) {
        throw new NotFoundException(`ไม่พบ Ticket No: ${normalizedTicketNo}`);
      }

      const ticket_id = ticket.id;

      // ✅ Attachments
      const issueAttachment = await this.attachmentRepo
        .createQueryBuilder('a')
        .select(['a.id AS attachment_id', 'a.extension', 'a.filename'])
        .where('a.ticket_id = :ticket_id AND a.type = :type', { ticket_id, type: 'reporter' })
        .andWhere('a.isenabled = true')
        .getRawMany();

      const fixAttachment = await this.attachmentRepo
        .createQueryBuilder('a')
        .select(['a.id AS attachment_id', 'a.extension', 'a.filename'])
        .where('a.ticket_id = :ticket_id AND a.type = :type', { ticket_id, type: 'supporter' })
        .andWhere('a.isenabled = true')
        .getRawMany();

      // ✅ Status History
      const statusHistory = await this.historyRepo
        .createQueryBuilder('sh')
        .leftJoin('ticket_status', 'ts', 'ts.id = sh.status_id')
        .leftJoin('ticket_status_language', 'tsl', 'tsl.status_id = ts.id AND tsl.language_id = :lang', { lang: 'th' })
        .select([
          'sh.status_id AS status_id',
          'sh.create_date AS create_date',
          'tsl.name AS status_name',
        ])
        .where('sh.ticket_id = :ticket_id', { ticket_id })
        .orderBy('sh.create_date', 'ASC')
        .getRawMany();

      // ✅ Assign
      const assign = await this.assignRepo
        .createQueryBuilder('ta')
        .leftJoin('users', 'u', 'u.id = ta.user_id')        // คนที่ถูก assign
        .leftJoin('users', 'ub', 'ub.id = ta.create_by')    // คนที่ assign ให้
        .leftJoin('ticket', 't', 't.id = ta.ticket_id')     // join เอา ticket_no
        .select([
          't.ticket_no AS ticket_no',
          `u.firstname || ' ' || u.lastname AS assignTo`,
          `ub.firstname || ' ' || ub.lastname AS assignBy`,
        ])
        .where('t.ticket_no = :ticket_no', { ticket_no: normalizedTicketNo })
        .getRawMany();


      // ✅ Return ครบทั้งหมด
      return {
        ticket: {
          id: ticket.id,
          ticket_no: ticket.ticket_no,
          categories_id: ticket.categories_id,
          categories_name: ticket.categories_name,
          project_id: ticket.project_id,
          project_name: ticket.project_name,
          issue_description: ticket.issue_description,
          fix_issue_description: ticket.fix_issue_description,
          status_id: ticket.status_id,
          status_name: ticket.status_name,
          close_estimate: ticket.close_estimate,
          estimate_time: ticket.estimate_time,
          due_date: ticket.due_date,
          lead_time: ticket.lead_time,
          related_ticket_id: ticket.related_ticket_id,
          change_request: ticket.change_request,
          create_date: ticket.create_date,
          create_by: ticket.create_by,
          update_date: ticket.update_date,
          update_by: ticket.update_by,
          isenabled: ticket.isenabled,
        },
        issue_attachment: issueAttachment.map(a => ({
          attachment_id: a.attachment_id,
          path: a.extension
            ? `${baseUrl}${attachmentPath}${a.attachment_id}.${a.extension}`
            : `${baseUrl}${attachmentPath}${a.attachment_id}`,
        })),
        fix_attachment: fixAttachment.map(a => ({
          attachment_id: a.attachment_id,
          path: a.extension
            ? `${baseUrl}${attachmentPath}${a.attachment_id}.${a.extension}`
            : `${baseUrl}${attachmentPath}${a.attachment_id}`,
        })),
        status_history: statusHistory.map(sh => ({
          status_id: sh.status_id,
          status_name: sh.status_name,
          create_date: sh.create_date,
        })),
        assign: assign.map(a => ({
          ticket_no: a.ticket_no,
          assignTo: a.assignto,
          assignBy: a.assignby,
        })),
      };
    } catch (error) {
      console.error('Error in getTicketDataByNo:', error);
      throw error;
    }
  }

  // ✅ แก้ไข softDeleteTicket method ถ้า entity ไม่มี deleted_at field

  async softDeleteTicket(ticket_no: string, userId: number): Promise<void> {
    try {
      console.log(`🗑️ Soft deleting ticket: ${ticket_no} by user: ${userId}`);

      const normalizedTicketNo = this.normalizeTicketNo(ticket_no);
      console.log(`📝 Normalized ticket_no: ${normalizedTicketNo}`);

      const ticket = await this.ticketRepo.findOne({
        where: {
          ticket_no: normalizedTicketNo,
          isenabled: true
        }
      });

      if (!ticket) {
        console.log(`❌ Ticket not found: ${normalizedTicketNo}`);
        throw new NotFoundException(`ไม่พบ Ticket No: ${normalizedTicketNo}`);
      }

      console.log(`✅ Ticket found: ID ${ticket.id}, created by: ${ticket.create_by}`);

      // ✅ ตรวจสอบสิทธิ์ - เป็นเจ้าของหรือมีสิทธิ์ delete
      if (ticket.create_by !== userId) {
        console.log(`❌ Permission denied: ${userId} is not owner of ticket created by ${ticket.create_by}`);
        throw new ForbiddenException('คุณไม่มีสิทธิ์ลบตั๋วนี้ (ไม่ใช่เจ้าของ)');
      }

      console.log('✅ Permission granted - user is ticket owner');

      // ✅ Soft delete ticket (แค่เปลี่ยน isenabled เป็น false)
      ticket.isenabled = false;
      ticket.update_by = userId;
      ticket.update_date = new Date();

      // ✅ ถ้า entity มี deleted_at field ให้ uncomment บรรทัดนี้
      // ticket.deleted_at = new Date();

      await this.ticketRepo.save(ticket);
      console.log('✅ Ticket soft deleted successfully');

      // ✅ Soft delete attachments ด้วย (ถ้ามี service)
      try {
        await this.attachmentService.softDeleteAllByTicketId(ticket.id);
        console.log('✅ Attachments soft deleted successfully');
      } catch (attachmentError) {
        console.warn('⚠️ Warning: Could not soft delete attachments:', attachmentError.message);
        // ไม่ throw error เพราะการลบ ticket หลักสำเร็จแล้ว
      }

      console.log(`✅ Soft delete completed for ticket ${normalizedTicketNo}`);
    } catch (error) {
      console.error('💥 Error in softDeleteTicket:', error);
      throw error;
    }
  }

  // ✅ แก้ไข restoreTicketByNo method
  async restoreTicketByNo(ticket_no: string, userId: number): Promise<void> {
    try {
      console.log(`🔄 Restoring ticket: ${ticket_no} by user: ${userId}`);

      const normalizedTicketNo = this.normalizeTicketNo(ticket_no);

      const ticket = await this.ticketRepo.findOne({
        where: {
          ticket_no: normalizedTicketNo,
          isenabled: false // หาตั๋วที่ถูกลบ
        }
      });

      if (!ticket) {
        console.log(`❌ Deleted ticket not found: ${normalizedTicketNo}`);
        throw new NotFoundException(`ไม่พบ Ticket No ที่ถูกลบ: ${normalizedTicketNo}`);
      }

      console.log(`✅ Deleted ticket found: ID ${ticket.id}`);

      // ✅ ตรวจสอบสิทธิ์
      if (ticket.create_by !== userId) {
        console.log(`❌ Restore permission denied`);
        throw new ForbiddenException('คุณไม่มีสิทธิ์กู้คืนตั๋วนี้ (ไม่ใช่เจ้าของ)');
      }

      // ✅ ตรวจสอบระยะเวลา (ถ้าต้องการ - 7 วัน)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      if (ticket.update_date && ticket.update_date < sevenDaysAgo) {
        console.log(`❌ Restore period expired`);
        throw new BadRequestException('ไม่สามารถกู้คืนได้ เนื่องจากเกินระยะเวลา 7 วัน');
      }

      console.log('✅ Restore permission granted');

      // ✅ Restore ticket
      ticket.isenabled = true;
      ticket.update_by = userId;
      ticket.update_date = new Date();

      // ✅ ถ้า entity มี deleted_at field ให้ uncomment บรรทัดนี้
      // ticket.deleted_at = null;

      await this.ticketRepo.save(ticket);
      console.log('✅ Ticket restored successfully');

      // ✅ Restore attachments ด้วย (ถ้ามี service)
      try {
        await this.attachmentService.restoreAllByTicketId(ticket.id);
        console.log('✅ Attachments restored successfully');
      } catch (attachmentError) {
        console.warn('⚠️ Warning: Could not restore attachments:', attachmentError.message);
      }

      console.log(`✅ Restore completed for ticket ${normalizedTicketNo}`);
    } catch (error) {
      console.error('💥 Error in restoreTicketByNo:', error);
      throw error;
    }
  }

  // ✅ เพิ่ม method ดึงตั๋วที่ถูกลบ (ปรับให้ไม่ต้องใช้ deleted_at)
  async getDeletedTickets(): Promise<any[]> {
    try {
      console.log('📋 Getting deleted tickets...');

      const deletedTickets = await this.ticketRepo.find({
        where: { isenabled: false },
        order: { update_date: 'DESC' }, // ใช้ update_date แทน deleted_at
        take: 50 // จำกัดแค่ 50 รายการล่าสุด
      });

      console.log(`✅ Found ${deletedTickets.length} deleted tickets`);

      return deletedTickets.map(ticket => {
        // ตรวจสอบว่ากู้คืนได้หรือไม่ (ภายใน 7 วัน)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const canRestore = ticket.update_date && ticket.update_date > sevenDaysAgo;

        return {
          id: ticket.id,
          ticket_no: ticket.ticket_no,
          issue_description: ticket.issue_description?.substring(0, 100) + '...', // ตัดข้อความ
          create_by: ticket.create_by,
          create_date: ticket.create_date,
          deleted_at: ticket.update_date, // ใช้ update_date เป็น deleted_at
          update_by: ticket.update_by,
          can_restore: canRestore,
          days_until_permanent_delete: canRestore ?
            Math.ceil((ticket.update_date.getTime() + 7 * 24 * 60 * 60 * 1000 - Date.now()) / (24 * 60 * 60 * 1000)) : 0
        };
      });
    } catch (error) {
      console.error('💥 Error getting deleted tickets:', error);
      return [];
    }
  }

  // ✅ เพิ่ม method ค้นหา ticket จาก ticket_no
  async findTicketByNo(ticket_no: string): Promise<Ticket | null> {
    try {
      const normalizedTicketNo = this.normalizeTicketNo(ticket_no);

      return await this.ticketRepo.findOne({
        where: {
          ticket_no: normalizedTicketNo,
          isenabled: true
        }
      });
    } catch (error) {
      console.error('Error in findTicketByNo:', error);
      throw error;
    }
  }

  async getAllTicket(userId: number) {
    try {
      console.log('getAllTicket called with userId:', userId);

      // ดึง permission ของ user
      const userPermissions: number[] = await this.checkUserPermissions(userId);
      const isViewAll = userPermissions.includes(13); // VIEW_ALL_TICKETS

      const query = this.ticketRepo
        .createQueryBuilder('t')
        .select([
          't.ticket_no',
          't.categories_id',
          't.project_id',
          't.issue_description',
          't.status_id',
          't.create_by',
          't.create_date',
          'tcl.name AS categories_name',
          'p.name AS project_name',
          'tsl.name AS status_name'
        ])
        .leftJoin('ticket_categories_language', 'tcl', 'tcl.category_id = t.categories_id AND tcl.language_id = :lang', { lang: 'th' })
        .leftJoin('project', 'p', 'p.id = t.project_id')
        .leftJoin('ticket_status_language', 'tsl', 'tsl.status_id = t.status_id AND tsl.language_id = :lang', { lang: 'th' })
        .where('t.isenabled = true')
        .orderBy('t.create_date', 'DESC');

      if (!isViewAll) {
        query.andWhere('t.create_by = :userId', { userId });
      }

      const rawTickets = await query.getRawMany();

      const tickets = rawTickets.map(t => ({
        ticket_no: t.t_ticket_no,
        categories_id: t.t_categories_id,
        project_id: t.t_project_id,
        issue_description: t.t_issue_description,
        status_id: t.t_status_id,
        create_by: t.t_create_by,
        create_date: t.t_create_date,
        categories_name: t.categories_name,
        project_name: t.project_name,
        status_name: t.status_name,
      }));

      return tickets;

    } catch (error) {
      console.log('Error in getAllTicket:', error.message);
      throw new Error(`Failed to get tickets: ${error.message}`);
    }
  }

  async getAllMasterFilter(userId: number): Promise<any> {
    try {
      console.log('🔍 Starting getAllMasterFilter for userId:', userId);

      // 1️⃣ Categories
      const categories = await this.categoryRepo
        .createQueryBuilder('tc')
        .innerJoin('ticket_categories_language', 'tcl', 'tcl.category_id = tc.id')
        .where('tc.isenabled = true')
        .andWhere('tcl.language_id = :lang', { lang: 'th' })
        .select(['tc.id AS id', 'tcl.name AS name'])
        .getRawMany();

      console.log('✅ Categories found:', categories.length);

      // 2️⃣ ตรวจสอบสิทธิ์ project
      const userPermissions: number[] = await this.checkUserPermissions(userId);
      const canViewAllMaster = await this.permissionService.canReadAllProject(userId, userPermissions);
      console.log('canViewAllMaster:', canViewAllMaster);

      // 3️⃣ Projects
      let projectsQuery = this.projectRepo
        .createQueryBuilder('p')
        .leftJoin('customer_for_project', 'cp', 'cp.project_id = p.id')
        .where('p.isenabled = true');

      // ถ้าไม่ใช่ admin → filter ให้ดูเฉพาะ project ของตัวเอง
      if (!canViewAllMaster) {
        projectsQuery = projectsQuery
          .andWhere('cp.isenabled = true')
          .andWhere('cp.user_id = :userId', { userId: Number(userId) });
      }

      projectsQuery = projectsQuery
        .select(['DISTINCT p.id AS id', 'p.name AS name']);

      const projects = await projectsQuery.getRawMany();

      console.log('✅ Projects found:', projects.length);

      // 4️⃣ Status
      const status = await this.statusRepo
        .createQueryBuilder('ts')
        .innerJoin('ticket_status_language', 'tsl', 'tsl.status_id = ts.id')
        .where('ts.isenabled = true')
        .andWhere('tsl.language_id = :lang', { lang: 'th' })
        .select(['ts.id AS id', 'tsl.name AS name'])
        .getRawMany();

      console.log('✅ Status found:', status.length);

      return {
        code: 1,
        message: 'Success',
        data: { categories, projects, status },
      };
    } catch (error) {
      console.error('❌ Error in getAllMasterFilter:', {
        message: error.message,
        stack: error.stack,
        userId,
      });

      return {
        code: 2,
        message: `เกิดข้อผิดพลาด: ${error.message}`,
        data: null,
      };
    }
  }


  async findTicketById(id: number) {
    try {
      return await this.ticketRepo.findOne({ where: { id } });
    } catch (error) {
      console.error('Error in findTicketById:', error);
      throw error;
    }
  }

  async getTicketById(id: number): Promise<Ticket> {
    try {
      const ticket = await this.findTicketById(id);
      if (!ticket) {
        throw new NotFoundException(`Ticket with id ${id} not found`);
      }
      return ticket;
    } catch (error) {
      console.error('Error in getTicketById:', error);
      throw error;
    }
  }

  async getTicketByNo(ticket_no: string): Promise<Ticket> {
    try {
      const ticket = await this.findTicketByNo(ticket_no);
      if (!ticket) {
        throw new NotFoundException(`Ticket with id ${ticket_no} not found`);
      }
      return ticket;
    } catch (error) {
      console.error('Error in getTicketById:', error);
      throw error;
    }
  }

  async saveSupporter(
    ticketNo: string,
    body: any,
    files: Express.Multer.File[],
    currentUserId: number,
    status_id: number,
    assignTo: number,
  ) {
    const results: any = {};

    if (!ticketNo) throw new Error('ticket_no is required');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 0. ตรวจสอบสิทธิ์
      const userPermissions = await this.checkUserPermissions(currentUserId);
      if (![8, 19].some(p => userPermissions.includes(p))) {
        throw new Error('Permission denied');
      }

      // 1. Update ticket fields + คำนวณเวลา
      const chk = await this.updateTicketFieldsWithTimeCalculation(ticketNo, body, currentUserId, results);

      // 2. Handle attachments
      if (files?.length) {
        const ticketForFiles = await queryRunner.manager.findOne(this.ticketRepo.target, { where: { ticket_no: ticketNo } });
        if (!ticketForFiles) throw new Error(`Ticket ${ticketNo} not found`);
        await this.createAttachments(files, ticketForFiles.id, currentUserId, results);
      }

      // 3. Update status + insert history
      if (chk) {
        // Update ticket status
        await queryRunner.manager.update(this.ticketRepo.target, { ticket_no: ticketNo }, { status_id });

        // ดึง ticket_id
        const ticket = await queryRunner.manager.findOne(this.ticketRepo.target, {
          where: { ticket_no: ticketNo },
          select: ['id']
        });
        if (!ticket) throw new Error(`Ticket ${ticketNo} not found after update`);

        // Insert status_history
        await queryRunner.manager.insert(this.historyRepo.target, {
          ticket_id: ticket.id,
          status_id,
          create_by: currentUserId,
          create_date: new Date()
        });

        if (assignTo) {
          console.log('🔄 Assigning ticket to user_id:', assignTo);

          // ตรวจสอบว่า ticket นี้มีการ assign แล้วหรือยัง
          const existingAssign = await queryRunner.manager.findOne(this.assignRepo.target, {
            where: { ticket_id: ticket.id }
          });

          if (existingAssign) {
            // Update คนที่ถูก assign
            await queryRunner.manager.update(this.assignRepo.target,
              { ticket_id: ticket.id },
              {
                user_id: assignTo,        // คนที่ถูก assign
                create_by: currentUserId, // คนที่ทำการ assign
                create_date: new Date()
              }
            );
            await queryRunner.manager.save(TicketAssigned, existingAssign);
            console.log('✅ Updated existing ticket_assigned');
          } else {
            // Insert ใหม่
            const newAssign = queryRunner.manager.create(this.assignRepo.target, {
              ticket_id: ticket.id,
              user_id: assignTo,
              create_by: currentUserId,
              create_date: new Date()
            });

            await queryRunner.manager.save(newAssign);
            console.log('✅ Assigning ticket to user_id:', assignTo);
            console.log('Inserted new ticket_assigned:', newAssign)
          }
        }
      }

      await queryRunner.commitTransaction();

      // ✅ Return JSON-safe
      return {
        ticket_no: ticketNo,
        updated_status_id: status_id,
        results
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new Error(`Failed to save supporter data: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  private async updateTicketFieldsWithTimeCalculation(
    ticketNo: string,
    formData: any,
    currentUserId: number,
    results: any
  ) {
    // ดึงข้อมูล ticket ปัจจุบัน
    const currentTicket = await this.ticketRepo.findOne({
      where: { ticket_no: ticketNo },
      relations: ['history']
    });

    if (!currentTicket) {
      throw new Error(`Ticket with ticket_no ${ticketNo} not found`);
    }

    // เตรียมข้อมูล update
    const updateData: Partial<Ticket> = {
      update_by: currentUserId,
      update_date: new Date()
    };

    // 1. ใช้ค่าจาก Frontend ถ้ามี, else ไม่เปลี่ยน
    if (formData.estimate_time !== undefined) {
      const estimate = parseInt(formData.estimate_time);
      if (isNaN(estimate) || estimate < 0) throw new BadRequestException('estimate_time ไม่ถูกต้อง');
      updateData.estimate_time = estimate;
    }

    if (formData.due_date) {
      const due = new Date(formData.due_date);
      if (isNaN(due.getTime())) throw new BadRequestException('due_date ไม่ถูกต้อง');
      updateData.due_date = due;
    }

    if (formData.close_estimate) {
      const close = new Date(formData.close_estimate);
      if (isNaN(close.getTime())) throw new BadRequestException('close_estimate ไม่ถูกต้อง');
      updateData.close_estimate = close;
    }

    if (formData.lead_time !== undefined) {
      const lead = parseInt(formData.lead_time);
      if (isNaN(lead) || lead < 0) throw new BadRequestException('lead_time ไม่ถูกต้อง');
      updateData.lead_time = lead;
    }

    // 2. อัพเดทข้อมูลอื่น ๆ
    if (formData.fix_issue_description) updateData.fix_issue_description = formData.fix_issue_description;
    if (formData.related_ticket_id) updateData.related_ticket_id = formData.related_ticket_id;

    // Update ticket
    await this.ticketRepo.update({ ticket_no: ticketNo }, updateData);

    // Get updated ticket
    const updatedTicket = await this.ticketRepo.findOne({ where: { ticket_no: ticketNo } });

    if (updatedTicket) {
      results['ticket'] = updatedTicket;
      results['status'] = true;
    } else {
      results['ticket'] = null;
      results['status'] = false;
    }

    return results;
  }

  private async createAttachments(
    files: Express.Multer.File[],
    ticketId: number,
    currentUserId: number,
    result: any
  ) {
    const attachments: TicketAttachment[] = [];

    let counter = 1; // เริ่มนับไฟล์

    for (const file of files) {
      const extension = file.originalname.split('.').pop()?.substring(0, 10) || '';

      // ใช้ pattern: [ticket_id]_[counter].[extension]
      const filename = `${ticketId}_${counter}.${extension}`;

      const attachmentData = {
        ticket_id: ticketId,
        type: 'reporter', // หรือ supporter ตามที่ใช้
        extension: extension,
        filename: filename.substring(0, 10), // ป้องกันยาวเกิน varchar(10)
        create_by: currentUserId,
        update_by: currentUserId
      };

      const attachment = await this.attachmentRepo.save(attachmentData);
      attachments.push(attachment);

      counter++; // เพิ่มลำดับไฟล์
    }

    result['attachments'] = attachments;
  }


  // ✅ เพิ่ม method สำหรับ update ticket ด้วย ticket_no (ที่ Controller ต้องการ)
  async updateTicket(
    ticket_no: string,
    updateData: UpdateTicketDto,
    userId: number
  ): Promise<Ticket> {
    const normalizedTicketNo = this.normalizeTicketNo(ticket_no);

    const ticket = await this.ticketRepo.findOne({
      where: {
        ticket_no: normalizedTicketNo,
        isenabled: true
      }
    });

    if (!ticket) {
      throw new NotFoundException(`ไม่พบ Ticket No: ${normalizedTicketNo}`);
    }

    // ตรวจสอบสิทธิ์ด้วย create_by
    if (ticket.create_by !== userId) {
      throw new ForbiddenException('You do not have permission to update this ticket');
    }

    // อัพเดตข้อมูล
    Object.assign(ticket, updateData);
    ticket.update_date = new Date();
    ticket.update_by = userId;

    // บันทึก status history ถ้ามีการเปลี่ยน status
    if (updateData.status_id && updateData.status_id !== ticket.status_id) {
      const existingHistory = await this.historyRepo.findOne({
        where: { ticket_id: ticket.id, status_id: updateData.status_id },
        order: { create_date: 'DESC' },
      });

      if (!existingHistory) {
        const newHistory = this.historyRepo.create({
          ticket_id: ticket.id,
          status_id: updateData.status_id,
          create_date: new Date(),
          create_by: userId,
        });
        await this.historyRepo.save(newHistory);
      }
    }

    return this.ticketRepo.save(ticket);
  }

  async getTicketsByUserId(userId: number) {
    try {
      // ค้นหาตั๋วที่มี create_by เป็น userId ที่ระบุ
      const tickets = await this.ticketRepo.find({
        where: { create_by: userId },
        order: { create_date: 'DESC' }
      });

      return {
        code: 1,
        status: true,
        message: tickets.length > 0 ? 'ดึงข้อมูลตั๋วสำเร็จ' : 'ไม่พบตั๋วที่สร้างโดยผู้ใช้นี้',
        data: tickets
      };
    } catch (error) {
      console.error('Error getting tickets by user ID:', error);
      return {
        code: 0,
        status: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลตั๋ว',
        error: error.message
      };
    }
  }

  async getTicketsWithAttachmentsByUserId(userId: number) {
    try {
      // ค้นหาตั๋วที่มี create_by เป็น userId ที่ระบุ พร้อมข้อมูลไฟล์แนบ
      const tickets = await this.ticketRepo.find({
        where: { create_by: userId },
        relations: ['attachments'], // ต้องมีความสัมพันธ์กับไฟล์แนบในเอนทิตี้ Ticket
        order: { create_date: 'DESC' }
      });

      // แปลงข้อมูลไฟล์แนบให้อยู่ในรูปแบบที่ต้องการ
      const formattedTickets = tickets.map(ticket => {
        // ตรวจสอบว่า ticket.attachments มีค่าหรือไม่
        const attachments = ticket.attachments ? ticket.attachments.map(attachment => ({
          id: attachment.id,
          filename: attachment.filename,
          path: `uploads/attachments/${attachment.extension}_${ticket.id}_${attachment.id}.${attachment.extension}`,
          type: attachment.type,
          create_date: attachment.create_date
        })) : [];

        return {
          ...ticket,
          attachments
        };
      });

      return {
        code: 1,
        status: true,
        message: tickets.length > 0 ? 'ดึงข้อมูลตั๋วสำเร็จ' : 'ไม่พบตั๋วที่สร้างโดยผู้ใช้นี้',
        data: formattedTickets
      };
    } catch (error) {
      console.error('Error getting tickets with attachments by user ID:', error);
      return {
        code: 0,
        status: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลตั๋ว',
        error: error.message
      };
    }
  }
  // get ตั๋วทั้งหมด (admin)
  async getAllTicketWithoutFilter() {
    return this.ticketRepo.find({
      order: { create_date: 'DESC' },
      relations: ['project', 'categories', 'status'],
    });
  }

  // get เฉพาะตั๋วของตัวเอง
  async getTicketsByCreator(userId: number) {
    return this.ticketRepo.find({
      where: { create_by: userId },
      order: { create_date: 'DESC' },
      relations: ['project', 'categories', 'status'],
    });
  }

  async saveSatisfaction(
    ticketNo: string,
    createSatisfactionDto: CreateSatisfactionDto,
    currentUserId: number
  ) {
    // find ticket from ticket_no
    const ticket = await this.ticketRepo.findOne({
      where: { ticket_no: ticketNo }
    });

    if (!ticket) {
      throw new Error(`ไม่พบ ticket หมายเลข ${ticketNo}`);
    }

    // check ticket it close?
    if (ticket.status_id !== 5) {
      throw new Error('สามารถประเมินความพึงพอใจได้เฉพาะ ticket ที่เสร็จสิ้นแล้วเท่านั้น')
    }

    // ตรวจสอบว่าประเมิฯหรือยัง
    const existingSatisfaction = await this.satisfactionRepo.findOne({
      where: { ticket_id: ticket.id }
    });

    if (existingSatisfaction) {
      throw new Error('Ticket นี้ได้รับการประเมินความพึงพอใจแล้ว');
    }

    // บันทึกการประเมิน
    const satisfactionData = {
      ticket_id: ticket.id,
      rating: createSatisfactionDto.rating,
      create_by: currentUserId,
      create_date: new Date()
    };

    const satisfaction = await this.satisfactionRepo.save(satisfactionData);

    return {
      ticket_no: ticketNo,
      ticket_id: ticket.id,
      satisfaction: {
        id: satisfaction.id,
        rating: satisfaction.rating,
        create_by: satisfaction.create_by,
        create_date: satisfaction.create_date
      }
    };
  }

  // เพิ่ม method นี้
  async checkUserPermissions(userId: number): Promise<number[]> {
    const rows = await this.dataSource.query(
      'SELECT role_id FROM users_allow_role WHERE user_id = $1',
      [userId]
    );
    // rows = [{ role_id: 1 }, { role_id: 2 }, ...]
    const roleIds = rows.map(r => r.role_id);
    return roleIds;
  }

  // เพิ่ม method นี้
  async getUserPermissionsWithNames(userId: number) {
    const query = `
      SELECT mr.id, mr.name
      FROM master_role mr
      WHERE mr.id IN (
        SELECT (jsonb_array_elements_text(role_id))::int
        FROM users_allow_role
        WHERE user_id = $1
      )
    `;
    return await this.dataSource.query(query, [userId]);
  }

  // ✅ ปรับปรุง getTicketStatusWithName
  async getTicketStatusWithName(
    ticketId: number,
    languageId: string = 'th'
  ): Promise<{
    ticket_id: number;
    status_id: number;
    status_name: string;
    language_id: string;
    ticket_no?: string;
    create_date?: Date;
    updated_at?: Date;
  } | null> {
    try {
      console.log(`🎫 Getting status for ticket ${ticketId}, language: ${languageId}`);

      const result = await this.dataSource
        .createQueryBuilder()
        .select([
          't.id AS ticket_id',
          't.ticket_no AS ticket_no',
          't.status_id AS status_id',
          't.create_date AS create_date',
          't.updated_at AS updated_at',
          'COALESCE(tsl.name, ts.name, CONCAT(\'Status \', t.status_id)) AS status_name',
          'COALESCE(tsl.language_id, :defaultLang) AS language_id'
        ])
        .from('ticket', 't')
        .leftJoin('ticket_status', 'ts', 'ts.id = t.status_id AND ts.isenabled = true')
        .leftJoin(
          'ticket_status_language',
          'tsl',
          'tsl.status_id = t.status_id AND tsl.language_id = :lang'
        )
        .where('t.id = :ticketId', { ticketId })
        .andWhere('t.isenabled = true')
        .setParameter('lang', languageId)
        .setParameter('defaultLang', languageId)
        .getRawOne();

      if (!result) {
        console.log(`❌ Ticket ${ticketId} not found`);
        return null;
      }

      console.log(`✅ Found ticket status:`, result);
      return result;

    } catch (error) {
      console.error('💥 Error getting ticket status:', error);
      return null;
    }
  }
}
