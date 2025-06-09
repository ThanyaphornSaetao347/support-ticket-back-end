import { Injectable } from '@nestjs/common';
import { CreateTicketStatusDto } from './dto/create-ticket_status.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket_status.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { TicketStatus } from './entities/ticket_status.entity';
import { Repository } from 'typeorm';
import { TicketStatusLanguage } from 'src/ticket_status_language/entities/ticket_status_language.entity';

@Injectable()
export class TicketStatusService {
  constructor(
    @InjectRepository(TicketStatus)
    private readonly statusRepo: Repository<TicketStatus>,

    @InjectRepository(TicketStatusLanguage)
    private readonly statusLangRepo: Repository<TicketStatusLanguage>,
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
  }