// src/ticket_attachment/ticket_attachment.controller.ts
import { Controller, Post, UploadedFiles, UseInterceptors, Body, BadRequestException, Request, UseGuards } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { TicketService } from 'src/ticket/ticket.service';
import { AttachmentService } from './ticket_attachment.service';
import { Users } from 'src/users/entities/user.entity';
import { AuthGuard } from '@nestjs/passport';

// เก็บ counter สำหรับแต่ละ ticket
const fileCounters = new Map<string, number>();

@Controller('api')
export class TicketAttachmentController {
  constructor(
    private readonly ticketService: TicketService,
    private readonly attachmentService: AttachmentService
  ) {}

  @Post('updateAttachment')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FilesInterceptor('files', 5, {
    storage: diskStorage({
      destination: './uploads/issue_attachment',
      filename: (req, file, cb) => {
        const ticket_id = req.body.ticket_id || '1';
        
        // ใช้ sequential numbering สำหรับแต่ละ ticket
        const currentCount = fileCounters.get(ticket_id) || 0;
        const nextCount = currentCount + 1;
        fileCounters.set(ticket_id, nextCount);
        
        const ext = extname(file.originalname);
        const tempFilename = `${ticket_id}_${nextCount}${ext}`;
        cb(null, tempFilename);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
        return cb(new BadRequestException('Only image files are allowed!'), false);
      }
      cb(null, true);
    },
    limits: {
      fileSize: 5 * 1024 * 1024,
    }
  }))
  async updateAttachment(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('ticket_id') ticket_id: string,
    @Body('project_id') project_id: string,
    @Body('categories_id') categories_id: string,
    @Body('issue_description') issue_description: string,
    @Body('type') type: string = 'reporter',
    @Request() req: any
  ) {
    try {
      // ตรวจสอบว่ามีไฟล์หรือไม่
      if (!files || files.length === 0) {
        throw new BadRequestException('No files uploaded');
      }

      // ตรวจสอบ ticket_id
      if (!ticket_id) {
        throw new BadRequestException('ticket_id is required');
      }

      const uploadedFiles: any[] = [];
      const errors: any[] = [];

      // Process แต่ละไฟล์
      for (const file of files) {
        try {
          // ประมวลผลไฟล์
          const processedFile = await this.processImage(file);
          
          // เรียกใช้ AttachmentService ตามที่ต้องการ
          const attachment = await this.attachmentService.create({
            ticket_id: parseInt(ticket_id), // แปลงเป็น number
            type,
            file: file, // ส่ง Express.Multer.File object ตรงๆ
            create_by: req.user.id
          });

          // เก็บข้อมูลเพิ่มเติม (project_id, category_id, issue_description) ไว้ใช้ต่อ
          if (project_id || categories_id || issue_description) {
            console.log('Additional data to process:', { 
              project_id, 
              categories_id, 
              issue_description,
              attachment_id: attachment.id 
            });
            // สามารถเพิ่ม logic เพื่อบันทึกข้อมูลเพิ่มเติมในตารางอื่นได้ที่นี่
          }

          uploadedFiles.push({
            id: attachment.id,
            filename: attachment.filename, // ใช้ filename จาก database
            original_name: file.originalname,
            file_size: processedFile.size,
            file_url: `/uploads/issue_attachment/${file.filename}`, // ใช้ filename จริงจาก file system
            extension: attachment.extension
          });

          // ลบไฟล์ temp ถ้าจำเป็น
          if (file.filename !== processedFile.filename) {
            await this.deleteFile(file.path);
          }

        } catch (error) {
          console.error('File processing error:', error);
          
          // ลบไฟล์ที่ upload ไว้แล้วถ้าเกิดข้อผิดพลาด
          if (file.path) {
            await this.deleteFile(file.path);
          }
          
          errors.push({
            filename: file.originalname,
            error: error.message
          });
        }
      }

      // ส่งผลลัพธ์
      const response = {
        success: uploadedFiles.length > 0,
        message: `Successfully uploaded ${uploadedFiles.length} file(s)`,
        data: {
          uploaded_files: uploadedFiles,
          total_uploaded: uploadedFiles.length,
          total_files: files.length,
          errors: errors.length > 0 ? errors : undefined
        }
      };

      if (errors.length === 0) {
        return response;
      }
      
      if (uploadedFiles.length > 0) {
        return {
          ...response,
          message: `Uploaded ${uploadedFiles.length}/${files.length} files with some errors`
        };
      }
      
      throw new BadRequestException({
        message: 'Failed to upload any files',
        errors: errors
      });

    } catch (error) {
      console.error('Upload error:', error);
      
      // ทำความสะอาดไฟล์ที่อัปโหลดไว้แล้วถ้าเกิดข้อผิดพลาด
      if (files && files.length > 0) {
        for (const file of files) {
          if (file.path) {
            await this.deleteFile(file.path);
          }
        }
      }
      throw error;
    }
  }

  // Helper methods
  private async deleteFile(filePath: string): Promise<void> {
    try {
      const fs = require('fs').promises;
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Failed to delete file:', filePath, error);
    }
  }

  private async processImage(file: Express.Multer.File): Promise<{
    filename: string;
    path: string;
    size: number;
  }> {
    return {
      filename: file.filename,
      path: file.path,
      size: file.size
    };
  }
}