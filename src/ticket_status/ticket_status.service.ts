import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTicketStatusDto } from './dto/create-ticket_status.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket_status.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { TicketStatus } from './entities/ticket_status.entity';
import { Ticket } from 'src/ticket/entities/ticket.entity';
import { DataSource, Repository } from 'typeorm';
import { TicketStatusLanguage } from 'src/ticket_status_language/entities/ticket_status_language.entity';
import { TicketStatusHistoryService } from 'src/ticket_status_history/ticket_status_history.service';

@Injectable()
export class TicketStatusService {
  constructor(
    @InjectRepository(TicketStatus)
    private readonly statusRepo: Repository<TicketStatus>,

    private readonly historyService: TicketStatusHistoryService,

    @InjectRepository(TicketStatusLanguage)
    private readonly statusLangRepo: Repository<TicketStatusLanguage>,

    private dataSource: DataSource,
  ){}


  async createStatus(creaateStatusDto: CreateTicketStatusDto) {
      try {
        // ตรวจสอบความซ้ำซ้อนของชื่อ category ในแต่ละภาษา
        for (const lang of creaateStatusDto.statusLang) {
          const existingStatus = await this.statusLangRepo
            .createQueryBuilder('tsl')
            .innerJoin('tsl.status', 'ts')
            .where('LOWER(tsl.name) = LOWER(:name)', { name: lang.name.trim() })
            .andWhere('tsl.language_id = :languageId', { languageId: lang.language_id })
            .andWhere('ts.isenabled = :enabled', { enabled: true })
            .getOne();
  
          if (existingStatus) {
            return {
              code: 0,
              message: `Status name "${lang.name}" already exists for language "${lang.language_id}"`,
              data: {
                existing_category: {
                  id: existingStatus.status_id,
                  name: existingStatus.name,
                  language_id: existingStatus.language_id,
                },
              },
            };
          }
        }
        // ตรวจสอบซ้ำในชุดข้อมูลที่ส่งมา (ป้องกันการส่งภาษาเดียวกันซ้ำ)
        const languageIds = creaateStatusDto.statusLang.map(lang => lang.language_id);
        const uniqueLanguageIds = [...new Set(languageIds)];
        if (languageIds.length !== uniqueLanguageIds.length) {
          return {
            code: 0,
            message: 'Duplicate language_id found in the request',
          };
        }
  
        // ตรวจสอบชื่อซ้ำในชุดข้อมูลเดียวกัน
        const names = creaateStatusDto.statusLang.map(lang => 
          `${lang.language_id}:${lang.name.toLowerCase().trim()}`
        );
        const uniqueNames = [...new Set(names)];
        if (names.length !== uniqueNames.length) {
          return {
            code: 0,
            message: 'Duplicate category name found in the same language within the request',
          };
        }
  
        // สร้าง category หลัก
        const tstatus = this.statusRepo.create({
          create_by: creaateStatusDto.create_by,
          create_date: new Date(),
          isenabled: true,
        });
        const savedStatus = await this.statusRepo.save(tstatus);
  
        // สร้าง language records สำหรับแต่ละภาษา
        const languagePromises = creaateStatusDto.statusLang.map(async (lang) => {
          const statusLang = this.statusLangRepo.create({
            status_id: savedStatus.id,
            language_id: lang.language_id.trim(),
            name: lang.name.trim(),
          });
          return await this.statusLangRepo.save(statusLang);
        });
  
        const savedLanguages = await Promise.all(languagePromises);
  
        return {
          code: 1,
          message: 'Category created successfully',
          data: {
            id: savedStatus.id,
            create_by: savedStatus.create_by,
            create_date: savedStatus.create_date,
            isenabled: savedStatus.isenabled,
            languages: savedLanguages.map(lang => ({
              id: lang.status_id,
              language_id: lang.language_id,
              name: lang.name,
            })),
          },
        };
      } catch (error) {
        return {
          code: 0,
          message: 'Failed to create category',
          error: error.message,
        };
      }
    }
  
    // Method สำหรับ backward compatibility (ถ้าจำเป็น)
    async createCategoryOld(body: {
      isenabled: boolean;
      create_by: number;
      language_id: string;
      name: string;
    }) {
      // ticketcategories table
      const tstatus = this.statusRepo.create({
        isenabled: body.isenabled,
        create_by: body.create_by,
        create_date: new Date(),
      });
      const savedCategory = await this.statusRepo.save(tstatus);
  
      // language table
      const categoryLang = this.statusLangRepo.create({
        status_id: savedCategory.id,
        language_id: body.language_id,
        name: body.name,
      });
      await this.statusLangRepo.save(categoryLang);
  
      return {
        code: 1,
        message: 'Category created successfully',
        data: {
          id: savedCategory.id,
          name: categoryLang.name,
        },
      };
    }
  
    async findAll() {
      const statuS = await this.statusRepo.find({
        relations: ['languages'],
        where: { isenabled: true },
      });
  
      return {
        code: 1,
        message: 'Success',
        data: statuS,
      };
    }
  
    async findOne(id: number) {
      const category = await this.statusRepo.findOne({
        where: { id, isenabled: true },
        relations: ['languages'],
      });
  
      if (!category) {
        return {
          code: 0,
          message: 'Category not found',
        };
      }
  
      return {
        code: 1,
        message: 'Success',
        data: category,
      };
    }
  
    // Method สำหรับตรวจสอบว่าชื่อ category ซ้ำหรือไม่
    async checkCategoryNameExists(name: string, languageId: string, excludeStatusId?: number) {
      const query = this.statusLangRepo
        .createQueryBuilder('tsl')
        .innerJoin('tcl.status', 'ts')
        .where('LOWER(tsl.name) = LOWER(:name)', { name: name.trim() })
        .andWhere('tsl.language_id = :languageId', { languageId })
        .andWhere('ts.isenabled = :enabled', { enabled: true });
  
      // ถ้ามี excludeCategoryId แสดงว่าเป็นการ update ให้ไม่เช็คกับตัวเอง
      if (excludeStatusId) {
        query.andWhere('tc.id != :excludeId', { excludeId: excludeStatusId });
      }
  
      const existing = await query.getOne();
      return !!existing;
    }
  
    // Method สำหรับ validate ข้อมูลก่อนสร้าง/อัพเดต
    async validateCategoryData(languages: { language_id: string; name: string }[], excludeStatusId?: number) {
      const errors: string[] = [];
  
      // ตรวจสอบซ้ำในฐานข้อมูล
      for (const lang of languages) {
        const isDuplicate = await this.checkCategoryNameExists(
          lang.name, 
          lang.language_id, 
          excludeStatusId
        );
        
        if (isDuplicate) {
          errors.push(`Status name "${lang.name}" already exists for language "${lang.language_id}"`);
        }
      }
  
      // ตรวจสอบซ้ำในชุดข้อมูลที่ส่งมา
      const languageIds = languages.map(lang => lang.language_id);
      const uniqueLanguageIds = [...new Set(languageIds)];
      if (languageIds.length !== uniqueLanguageIds.length) {
        errors.push('Duplicate language_id found in the request');
      }
  
      // ตรวจสอบชื่อซ้ำในชุดข้อมูลเดียวกัน
      const names = languages.map(lang => 
        `${lang.language_id}:${lang.name.toLowerCase().trim()}`
      );
      const uniqueNames = [...new Set(names)];
      if (names.length !== uniqueNames.length) {
        errors.push('Duplicate status name found in the same language within the request');
      }
  
      return errors;
    }
  
    // Debug method เพื่อตรวจสอบข้อมูล
    async debugStatusData() {
      try {
        const statuS = await this.statusRepo.find();
        const statusLanguages = await this.statusLangRepo.find();
  
        return {
          code: 1,
          message: 'Debug data retrieved',
          data: {
            status: statuS,
            statusLanguages: statusLanguages,
            statussCount: statuS.length,
            languagesCount: statusLanguages.length,
          },
        };
      } catch (error) {
        return {
          code: 0,
          message: 'Failed to retrieve debug data',
          error: error.message,
        };
      }
    }

    // ✅ Method หลักสำหรับอัพเดต ticket status และบันทึก history
  async updateTicketStatusAndHistory(
    ticketId: number,
    newStatusId: number,
    userId: number,
    fixIssueDescription?: string,
    comment?: string
  ): Promise<{
    ticket: Ticket;
    history: any;
    status_name: string;
  }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      console.log(`🔄 Updating ticket ${ticketId} to status ${newStatusId} by user ${userId}`);

      // ✅ ตรวจสอบว่า ticket มีอยู่หรือไม่
      const ticket = await queryRunner.manager.findOne(Ticket, {
        where: { id: ticketId, isenabled: true }
      });

      if (!ticket) {
        throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
      }

      // ✅ ตรวจสอบว่า status ใหม่มีอยู่จริงหรือไม่
      const statusExists = await this.validateStatusExists(newStatusId);
      if (!statusExists) {
        throw new NotFoundException(`Status with ID ${newStatusId} not found`);
      }

      // ✅ เก็บ status เดิม
      const oldStatusId = ticket.status_id;
      const now = new Date();

      // ✅ อัพเดต ticket
      ticket.status_id = newStatusId;
      ticket.update_by = userId;
      ticket.update_date = now;

      // ✅ อัพเดต fix_issue_description ถ้ามีการส่งมา
      if (fixIssueDescription) {
        ticket.fix_issue_description = fixIssueDescription;
      }

      const updatedTicket = await queryRunner.manager.save(Ticket, ticket);

      // ✅ บันทึก status history ผ่าน TicketStatusHistoryService
      let history: any = null;
      if (oldStatusId !== newStatusId) {
        // เฉพาะเมื่อ status เปลี่ยนจริงๆ
        const historyData = {
          ticket_id: ticketId,
          status_id: newStatusId,
          create_by: userId,
          comment: comment || `Status changed from ${oldStatusId} to ${newStatusId}`,
        };

        history = await this.historyService.createHistory(historyData);
        console.log(`✅ Status history saved: ${oldStatusId} -> ${newStatusId}`);
      } else if (comment) {
        // ถ้า status ไม่เปลี่ยน แต่มี comment ให้บันทึก history อยู่ดี
        const historyData = {
          ticket_id: ticketId,
          status_id: newStatusId,
          create_by: userId,
          comment: comment,
        };

        history = await this.historyService.createHistory(historyData);
        console.log(`✅ Comment history saved for status ${newStatusId}`);
      }

      // ✅ ดึงชื่อ status สำหรับ response
      const statusName = await this.getStatusNameFromDatabase(newStatusId);

      await queryRunner.commitTransaction();

      console.log(`✅ Ticket ${ticketId} status updated successfully`);

      return {
        ticket: updatedTicket,
        history: history,
        status_name: statusName,
      };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('💥 Error updating ticket status:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ✅ Helper method สำหรับดึงชื่อ status จากฐานข้อมูล
  private async getStatusNameFromDatabase(statusId: number): Promise<string> {
    try {
      // ดึงชื่อ status จาก ticket_status_language
      const statusLang = await this.dataSource.manager
        .createQueryBuilder()
        .select('tsl.name')
        .from('ticket_status_language', 'tsl')
        .innerJoin('ticket_status', 'ts', 'ts.id = tsl.status_id')
        .where('tsl.status_id = :statusId', { statusId })
        .andWhere('tsl.language_id = :lang', { lang: 'th' }) // หรือภาษาที่ต้องการ
        .andWhere('ts.isenabled = true')
        .getRawOne();

      return statusLang?.name || `Status ${statusId}`;
    } catch (error) {
      console.error('Error getting status name:', error);
      return `Status ${statusId}`;
    }
  }

  // ✅ Method สำหรับดึง history ของ ticket ผ่าน HistoryService
  async getTicketStatusHistory(ticketId: number): Promise<any[]> {
    try {
      return await this.historyService.getTicketHistory(ticketId);
    } catch (error) {
      console.error('Error getting ticket status history:', error);
      throw error;
    }
  }

  // ✅ Method สำหรับ validate status
  async validateStatusExists(statusId: number): Promise<boolean> {
    try {
      const status = await this.statusRepo.findOne({
        where: { id: statusId, isenabled: true }
      });
      return !!status;
    } catch (error) {
      console.error('Error validating status:', error);
      return false;
    }
  }

  // ✅ Method สำหรับดึง status พร้อมชื่อ
  async getStatusWithName(statusId: number, languageId: string = 'th'): Promise<{
    id: number;
    name: string;
  } | null> {
    try {
      const result = await this.statusRepo
        .createQueryBuilder('ts')
        .leftJoin('ticket_status_language', 'tsl', 'tsl.status_id = ts.id AND tsl.language_id = :lang', { lang: languageId })
        .select([
          'ts.id AS id',
          'tsl.name AS name',
        ])
        .where('ts.id = :statusId', { statusId })
        .andWhere('ts.isenabled = true')
        .getRawOne();

      return result ? {
        id: result.id,
        name: result.name || `Status ${statusId}`
      } : null;
    } catch (error) {
      console.error('Error getting status with name:', error);
      return null;
    }
  }

  // ✅ Method สำหรับดึงทุก status ที่ active
  async getAllActiveStatuses(languageId: string = 'th'): Promise<{
    id: number;
    name: string;
  }[]> {
    try {
      const statuses = await this.statusRepo
        .createQueryBuilder('ts')
        .leftJoin('ticket_status_language', 'tsl', 'tsl.status_id = ts.id AND tsl.language_id = :lang', { lang: languageId })
        .select([
          'ts.id AS id',
          'tsl.name AS name',
        ])
        .where('ts.isenabled = true')
        .orderBy('ts.id', 'ASC')
        .getRawMany();

      return statuses.map(s => ({
        id: s.id,
        name: s.name || `Status ${s.id}`
      }));
    } catch (error) {
      console.error('Error getting all active statuses:', error);
      return [];
    }
  }
  }