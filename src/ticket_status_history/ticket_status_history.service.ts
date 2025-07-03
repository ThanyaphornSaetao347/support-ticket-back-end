import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateTicketStatusHistoryDto } from './dto/create-ticket_status_history.dto';
import { UpdateTicketStatusHistoryDto } from './dto/update-ticket_status_history.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { TicketStatusHistory } from './entities/ticket_status_history.entity';
import { Repository } from 'typeorm';

@Injectable()
export class TicketStatusHistoryService {
  constructor(
    @InjectRepository(TicketStatusHistory)
    private readonly historyRepo: Repository<TicketStatusHistory>,
  ){}
  // ✅ บันทึก history entry ใหม่ (แก้ไขแล้ว)
  async createHistory(createData: {
    ticket_id: number;
    status_id: number;
    create_by: number;
  }): Promise<TicketStatusHistory> {
    try {
      console.log('📝 Creating ticket status history:', createData);

      // ✅ Validate required fields
      if (!createData.ticket_id || !createData.status_id || !createData.create_by) {
        throw new BadRequestException('ticket_id, status_id, and create_by are required');
      }

      // ✅ สร้าง entity โดยไม่ส่ง create_date (ให้ @CreateDateColumn จัดการ)
      const history = this.historyRepo.create({
        ticket_id: createData.ticket_id,
        status_id: createData.status_id,
        create_by: createData.create_by
        // create_date จะถูกสร้างอัตโนมัติจาก @CreateDateColumn
      });

      const savedHistory = await this.historyRepo.save(history);
      
      console.log('✅ History saved with ID:', savedHistory.id);
      return savedHistory;
    } catch (error) {
      console.error('💥 Error creating ticket status history:', error);
      throw error;
    }
  }

  // ✅ ดึง history ของ ticket โดยใช้ ticket_id โดยตรง
  async getTicketHistory(ticketId: number): Promise<TicketStatusHistory[]> {
    try {
      // ตรวจสอบว่า ticket มีอยู่จริง
      const ticket = await this.historyRepo.findOne({
        where: { id: ticketId } // ใช้ id แทน ticket_id
      });

      if (!ticket) {
        throw new Error(`Ticket with id ${ticketId} not found`);
      }

      // ดึง history โดยใช้ ticket_id
      return await this.historyRepo.find({
        where: { ticket_id: ticketId },
        relations: ['status', 'status.language'], // เพิ่ม relations เพื่อดึงข้อมูล status
        order: { create_date: 'DESC' }
      });
    } catch (error) {
      console.error('💥 Error getting ticket history:', error);
      throw error;
    }
  }

  // Helper methods เหมือนเดิม...
  async getStatusName(statusId: number): Promise<string> {
    const statusMap = {
      1: 'Create',
      2: 'Open Ticket', 
      3: 'In Progress',
      4: 'completed',
      5: 'Cancel',
      6: 'Cancelled'
    };
    
    return statusMap[statusId] || `Status ${statusId}`;
  }

  async getUserName(userId: number): Promise<string> {
    return `User ${userId}`; // Placeholder
  }

  async validateStatus(statusId: number, statusName: string): Promise<boolean> {
    try {
      const actualName = await this.getStatusName(statusId);
      return actualName.toLowerCase() === statusName.toLowerCase();
    } catch (error) {
      return false;
    }
  }

  findAll() {
    return `This action returns all ticketStatusHistory`;
  }

  findOne(id: number) {
    return `This action returns a #${id} ticketStatusHistory`;
  }

  update(id: number, updateTicketStatusHistoryDto: UpdateTicketStatusHistoryDto) {
    return `This action updates a #${id} ticketStatusHistory`;
  }

  remove(id: number) {
    return `This action removes a #${id} ticketStatusHistory`;
  }
}
