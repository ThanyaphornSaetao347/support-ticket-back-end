import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThan, Repository, MoreThan, FindManyOptions } from 'typeorm';
import { Ticket } from './entities/ticket.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketStatusHistory } from 'src/ticket_status_history/entities/ticket_status_history.entity';
import { TicketAttachment } from 'src/ticket_attachment/entities/ticket_attachment.entity';
import { TicketCategory } from 'src/ticket_categories/entities/ticket_category.entity';
import { AttachmentService } from 'src/ticket_attachment/ticket_attachment.service';
import { TicketStatus } from 'src/ticket_status/entities/ticket_status.entity';
import { TicketStatusHistoryService } from 'src/ticket_status_history/ticket_status_history.service';
import { TicketStatusLanguage } from 'src/ticket_status_language/entities/ticket_status_language.entity';
import { CreateTicketStatusDto } from 'src/ticket_status/dto/create-ticket_status.dto';

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
    private readonly dataSource: DataSource,
    @InjectRepository(TicketStatus)
    private readonly statusRepo: Repository<TicketStatus>,
  ) {}

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
        const result = await this.ticketRepo.findOne({ where: { id: dto.id }});
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

      // ✅ Query ข้อมูลหลัก Ticket ด้วย ticket_no
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
        .andWhere('t.isenabled = true') // ✅ เฉพาะที่ไม่ถูกลบ
        .getRawOne();

      if (!ticket) {
        throw new NotFoundException(`ไม่พบ Ticket No: ${normalizedTicketNo}`);
      }

      // ✅ ใช้ ticket.id ที่ได้จาก query ในการหา attachments และ history
      const ticket_id = ticket.id;

      // ✅ Query Attachments (เฉพาะที่ไม่ถูกลบ)
      const issueAttachment = await this.attachmentRepo
        .createQueryBuilder('a')
        .select(['a.id AS attachment_id', 'a.extension', 'a.filename'])
        .where('a.ticket_id = :ticket_id AND a.type = :type', { ticket_id, type: 'reporter' })
        .andWhere('a.isenabled = true') // ✅ เฉพาะที่ไม่ถูกลบ
        .getRawMany();

      const fixAttachment = await this.attachmentRepo
        .createQueryBuilder('a')
        .select(['a.id AS attachment_id', 'a.extension', 'a.filename'])
        .where('a.ticket_id = :ticket_id AND a.type = :type', { ticket_id, type: 'supporter' })
        .andWhere('a.isenabled = true') // ✅ เฉพาะที่ไม่ถูกลบ
        .getRawMany();

      // ✅ Query Status History
      const statusHistory = await this.historyRepo
        .createQueryBuilder('sh')
        .leftJoin('ticket_status', 'ts', 'ts.id = sh.status_id')
        .leftJoin('ticket_status_language', 'tsl', 'tsl.status_id = ts.id AND tsl.language_id = :lang', { lang: 'th' })
        .select([
          'sh.status_id AS status_id',
          'sh.create_date AS create_date',
          'tsl.name AS status_name'
        ])
        .where('sh.ticket_id = :ticket_id', { ticket_id })
        .orderBy('sh.create_date', 'ASC')
        .getRawMany();

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
          path: a.extension ? `${baseUrl}${attachmentPath}${a.attachment_id}.${a.extension}` : `${baseUrl}${attachmentPath}${a.attachment_id}`,
        })),
        fix_attachment: fixAttachment.map(a => ({
          attachment_id: a.attachment_id,
          path: a.extension ? `${baseUrl}${attachmentPath}${a.attachment_id}.${a.extension}` : `${baseUrl}${attachmentPath}${a.attachment_id}`,
        })),
        status_history: statusHistory.map(sh => ({
          status_id: sh.status_id,
          status_name: sh.status_name,
          create_date: sh.create_date,
        })),
      };
    } catch (error) {
      console.error('Error in getTicketDataByNo:', error);
      throw error;
    }
  }

  // ✅ เพิ่ม method สำหรับ soft delete ticket ด้วย ticket_no
  async softDeleteTicket(ticket_no: string, userId: number): Promise<void> {
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

    // ตรวจสอบสิทธิ์
    if (ticket.create_by !== userId) {
      throw new ForbiddenException('You do not have permission to delete this ticket');
    }

    // Soft delete ticket
    ticket.isenabled = false;
    ticket.deleted_at = new Date();
    ticket.update_by = userId;
    ticket.update_date = new Date();

    await this.ticketRepo.save(ticket);

    // Soft delete attachments ด้วย
    await this.attachmentService.softDeleteAllByTicketId(ticket.id);
  }

  async restoreTicketByNo(ticket_no: string, userId: number): Promise<void> {
    const normalizedTicketNo = this.normalizeTicketNo(ticket_no);
    
    const ticket = await this.ticketRepo.findOne({ 
      where: { 
        ticket_no: normalizedTicketNo,
        isenabled: false 
      } 
    });

    if (!ticket) {
      throw new NotFoundException(`ไม่พบ Ticket No ที่ถูกลบ: ${normalizedTicketNo}`);
    }

    // ตรวจสอบสิทธิ์
    if (ticket.create_by !== userId) {
      throw new ForbiddenException('You do not have permission to restore this ticket');
    }

    // ตรวจสอบว่ายังกู้คืนได้หรือไม่ (ภายใน 7 วัน)
    if (ticket.deleted_at) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      if (ticket.deleted_at < sevenDaysAgo) {
        throw new BadRequestException('Cannot restore ticket. Restoration period expired (over 7 days).');
      }
    }

    // Restore ticket
    ticket.isenabled = true;
    ticket.deleted_at = undefined;
    ticket.update_by = userId;
    ticket.update_date = new Date();

    await this.ticketRepo.save(ticket);

    // Restore attachments ด้วย
    await this.attachmentService.restoreAllByTicketId(ticket.id);
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

      const tickets = await this.ticketRepo
        .createQueryBuilder('t')
        .select([
          't.ticket_no',
          't.categories_id', 
          't.project_id',
          't.issue_description',
          't.status_id',
          't.create_by',
          't.create_date'
        ])
        .where('t.create_by = :userId', { userId })
        .orderBy('t.create_date', 'DESC')
        .getMany();

      console.log('Raw SQL result count:', tickets.length);
      console.log('Sample ticket:', tickets[0]);
      
      return tickets;
    } catch (error) {
      console.log('Error in getAllTicket:', error.message);
      throw new Error(`Failed to get tickets: ${error.message}`);
    }
  }

  async getAllMAsterFilter(userId: number): Promise<any> {
    try {
      // ดึง Categories
      const categories = await this.categoryRepo
      .createQueryBuilder('tc')
      .innerJoin('ticket_categories_language', 'tcl', 'tcl.category_id = tc.id AND tcl.language_id = :lang', {lang: 'th'})
      .where('tc.isenabled = true')
      .select(['tc.id AS id', 'tcl.name AS name'])
      .getRawMany();

      // ดึง project of user
      const projects = await this.dataSource.query(`
        SELECT p.id, p.name
        FROM project p
        INNER JOIN customer_for_project cp ON cp.project_id = p.id
        WHERE cp.user_id = $1 AND cp.isenabled = true
      `, [userId]);

      return {
        code: 1,
        message: 'Seccess',
        data: {
          categories,
          projects,
        },
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
}