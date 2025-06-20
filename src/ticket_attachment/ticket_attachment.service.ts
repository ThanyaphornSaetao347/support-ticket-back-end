// src/ticket_attachment/attachment.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketAttachment } from './entities/ticket_attachment.entity';
import { Ticket } from '../ticket/entities/ticket.entity';
import { extname } from 'path';

@Injectable()
export class AttachmentService {
  constructor(
    @InjectRepository(TicketAttachment)
    private readonly attachmentRepo: Repository<TicketAttachment>,
  ) {}

  /**
   * สร้างข้อมูลไฟล์แนบใหม่
   */
  async create(data: {
    ticket_id: number;
    type: string;
    file: Express.Multer.File;
    create_by: number;
  }): Promise<TicketAttachment> {
    // หา extension จาก originalname และจำกัดความยาว
    const extension = extname(data.file.originalname).substring(1); // ตัด . ออก
    const safeExtension = extension.length > 10 ? extension.substring(0, 10) : extension;
    
    // ใช้ filename ที่ส่งมาจาก controller (ที่ปรับแล้ว)
    const safeFilename = data.file.filename.length > 10 ? 
      data.file.filename.substring(0, 10) : 
      data.file.filename;
    
    // สร้าง entity ใหม่
    const attachment = new TicketAttachment();
    attachment.ticket_id = data.ticket_id;
    attachment.type = data.type;
    attachment.extension = safeExtension; // ใช้ extension ที่ปลอดภัย
    attachment.filename = safeFilename; // ใช้ filename ที่ปลอดภัย
    attachment.create_by = data.create_by;

    console.log('Saving attachment with:', {
      ticket_id: attachment.ticket_id,
      type: attachment.type,
      extension: attachment.extension,
      filename: attachment.filename,
      create_by: attachment.create_by
    });

    // บันทึกลงฐานข้อมูล
    return this.attachmentRepo.save(attachment);
  }

  /**
   * อัปเดตข้อมูลไฟล์แนบ
   */
  async update(id: number, data: Partial<TicketAttachment>): Promise<TicketAttachment | null> {
    await this.attachmentRepo.update(id, {...data});
    return this.attachmentRepo.findOne({ where: { id } });
  }

  /**
   * ค้นหาไฟล์แนบตาม ticket_id
   */
  async findByTicketId(ticketId: number): Promise<TicketAttachment[]> {
    return this.attachmentRepo.find({
      where: { ticket_id: ticketId },
      order: { create_date: 'DESC' },
    });
  }

  // ✅ ค้นหา attachment ที่เป็นรูปภาพด้วย ID
  async findImageById(id: number) {
  return await this.attachmentRepo
    .createQueryBuilder('a')
    .select([
      'a.id',
      'a.filename',
      'a.extension',
      'a.ticket_id',
    ])
    .where('a.id = :id', { id })
    .andWhere('a.extension IN (:...extensions)', { 
      extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff'] 
    })
    .getOne();
}

  /**
   * ค้นหาไฟล์แนบตาม id
   */
  async findById(id: number): Promise<TicketAttachment | null> {
    return this.attachmentRepo.findOne({ where: { id } });
  }

  /**
   * ลบไฟล์แนบ
   */
  async remove(id: number): Promise<void> {
    await this.attachmentRepo.delete(id);
  }

  /**
   * เพิ่มไฟล์แนบให้กับ ticket
   * สามารถใช้กับ ticket entity โดยตรง
   */
  async createWithTicket(data: { 
    ticket: Ticket;
    type?: string;
    filename?: string;
    extension?: string;
    create_by: number;
  }): Promise<TicketAttachment> {
    const attachment = new TicketAttachment();
    attachment.ticket_id = data.ticket.id;
    attachment.type = data.type || 'reporter';
    attachment.extension = (data.extension || '').substring(0, 10); // จำกัดความยาว
    attachment.filename = (data.filename || '').substring(0, 10); // จำกัดความยาว
    attachment.create_by = data.create_by;
    
    return this.attachmentRepo.save(attachment);
  }
}