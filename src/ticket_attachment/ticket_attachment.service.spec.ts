import { Test, TestingModule } from '@nestjs/testing';
import { TicketAttachmentController } from './ticket_attachment.controller';
import { AttachmentService } from './ticket_attachment.service';
import { TicketService } from '../ticket/ticket.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { FilesInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs');

// Mock util module properly
jest.mock('util', () => ({
  promisify: jest.fn((fn) => {
    // Return a jest mock function for each promisified function
    return jest.fn();
  }),
}));

describe('TicketAttachmentController', () => {
  let controller: TicketAttachmentController;
  let attachmentService: Partial<AttachmentService>;
  let ticketService: Partial<TicketService>;

  const mockAttachment = {
    id: 1,
    ticket_id: 1,
    type: 'Reporter',
    extension: 'jpg',
    filename: 'test_1.jpg',
    create_date: new Date(),
    create_by: 1,
    deleted_at: null,
    isenabled: true,
  };

  const mockFile: Express.Multer.File = {
    fieldname: 'files',
    originalname: 'test-image.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    buffer: Buffer.from('test'),
    size: 1024,
    destination: './uploads/issue_attachment',
    filename: 'test_1.jpg',
    path: './uploads/issue_attachment/test_1.jpg',
    stream: null,
  } as any;

  const mockRequest = {
    user: {
      id: 1,
      username: 'testuser',
    },
    body: {
      ticket_id: '1',
      type: 'reporter',
    },
  };

  const mockResponse = {
    set: jest.fn(),
    send: jest.fn(),
    download: jest.fn(),
    headersSent: false,
  } as unknown as Response;

  // Setup mock promisified functions
  let mockStat: jest.Mock;
  let mockReadFile: jest.Mock;

  beforeEach(async () => {
    const mockAttachmentService = {
      create: jest.fn(),
      findById: jest.fn(),
      deleteAttachment: jest.fn(),
    };

    const mockTicketService = {
      // Add ticket service methods if needed
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketAttachmentController],
      providers: [
        {
          provide: AttachmentService,
          useValue: mockAttachmentService,
        },
        {
          provide: TicketService,
          useValue: mockTicketService,
        },
      ],
    }).compile();

    controller = module.get<TicketAttachmentController>(TicketAttachmentController);
    attachmentService = module.get<AttachmentService>(AttachmentService);
    ticketService = module.get<TicketService>(TicketService);

    // Setup mock functions
    mockStat = jest.fn().mockResolvedValue({ size: 1024 });
    mockReadFile = jest.fn().mockResolvedValue(Buffer.from('test file content'));

    // Mock promisify to return our mock functions
    const { promisify } = require('util');
    promisify.mockImplementation((fn) => {
      if (fn.name === 'stat' || fn === fs.stat) return mockStat;
      if (fn.name === 'readFile' || fn === fs.readFile) return mockReadFile;
      return jest.fn();
    });

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getIssueAttachmentImage', () => {
    it('should serve image file successfully', async () => {
      attachmentService.findById = jest.fn().mockResolvedValue(mockAttachment);

      await controller.getIssueAttachmentImage(1, mockResponse);

      expect(attachmentService.findById).toHaveBeenCalledWith(1);
      expect(mockResponse.set).toHaveBeenCalledWith({
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
        'Content-Disposition': 'inline; filename="test_1.jpg"',
        'Content-Length': expect.any(String),
        'X-Attachment-ID': 1,
        'X-Ticket-ID': 1,
        'X-File-Extension': 'jpg',
      });
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it('should throw NotFoundException when attachment not found', async () => {
      attachmentService.findById = jest.fn().mockResolvedValue(null);

      await expect(
        controller.getIssueAttachmentImage(999, mockResponse)
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle different file extensions', async () => {
      const pdfAttachment = { ...mockAttachment, extension: 'pdf' };
      attachmentService.findById = jest.fn().mockResolvedValue(pdfAttachment);

      await controller.getIssueAttachmentImage(1, mockResponse);

      expect(mockResponse.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'inline; filename="test_1.jpg"',
        })
      );
    });

    it('should set attachment disposition for non-inline files', async () => {
      const zipAttachment = { ...mockAttachment, extension: 'zip' };
      attachmentService.findById = jest.fn().mockResolvedValue(zipAttachment);

      await controller.getIssueAttachmentImage(1, mockResponse);

      expect(mockResponse.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Type': 'application/zip',
          'Content-Disposition': 'attachment; filename="test_1.jpg"',
        })
      );
    });

    it('should throw NotFoundException when file not found on disk', async () => {
      attachmentService.findById = jest.fn().mockResolvedValue(mockAttachment);
      mockStat.mockRejectedValue(new Error('File not found'));

      await expect(
        controller.getIssueAttachmentImage(1, mockResponse)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getIssueAttachmentFile', () => {
    it('should serve any file type successfully', async () => {
      const docAttachment = { ...mockAttachment, extension: 'docx' };
      attachmentService.findById = jest.fn().mockResolvedValue(docAttachment);

<<<<<<< HEAD
      await controller.getFixIssueAttachmentImage(1, mockResponse);
=======
      await controller.getIssueAttachmentFile(1, mockResponse);
>>>>>>> 44b5f76e0a11799c862a981775c1a3a71ac974a4

      expect(attachmentService.findById).toHaveBeenCalledWith(1);
      expect(mockResponse.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        })
      );
    });
  });

  describe('downloadIssueAttachment', () => {
    it('should force download file successfully', async () => {
      attachmentService.findById = jest.fn().mockResolvedValue(mockAttachment);
      
      // Mock response.download to call callback without error
      (mockResponse.download as jest.Mock).mockImplementation((filePath, filename, callback) => {
        callback(null);
      });

      await controller.downloadIssueAttachment(1, mockResponse);

      expect(attachmentService.findById).toHaveBeenCalledWith(1);
      expect(mockResponse.download).toHaveBeenCalledWith(
        expect.stringContaining('test_1.jpg'),
        'test_1.jpg',
        expect.any(Function)
      );
    });

    it('should handle download errors', async () => {
      attachmentService.findById = jest.fn().mockResolvedValue(mockAttachment);
      
      // Mock response.download to call callback with error
      (mockResponse.download as jest.Mock).mockImplementation((filePath, filename, callback) => {
        callback(new Error('Download failed'));
      });

      await controller.downloadIssueAttachment(1, mockResponse);

      expect(attachmentService.findById).toHaveBeenCalledWith(1);
    });
  });

  describe('updateAttachment', () => {
    it('should upload single file successfully', async () => {
      const createdAttachment = { ...mockAttachment, id: 1 };
      attachmentService.create = jest.fn().mockResolvedValue(createdAttachment);

      const result = await controller.updateAttachment(
        [mockFile],
        '1',
        '1',
        '1',
        'Test issue',
        'reporter',
        mockRequest as any
      );

      expect(attachmentService.create).toHaveBeenCalledWith({
        ticket_id: 1,
        type: 'reporter',
        file: mockFile,
        create_by: 1,
      });

      expect(result.success).toBe(true);
      expect(result.data.uploaded_files).toHaveLength(1);
      expect(result.data.uploaded_files[0]).toEqual({
        id: 1,
        filename: 'test_1.jpg',
        original_name: 'test-image.jpg',
        file_size: 1024,
        file_url: '/images/issue_attachment/1',
        extension: 'jpg',
      });
    });

    it('should upload multiple files successfully', async () => {
      const files = [mockFile, { ...mockFile, filename: 'test_2.jpg' }];
      const createdAttachments = [
        { ...mockAttachment, id: 1 },
        { ...mockAttachment, id: 2, filename: 'test_2.jpg' },
      ];

      attachmentService.create = jest.fn()
        .mockResolvedValueOnce(createdAttachments[0])
        .mockResolvedValueOnce(createdAttachments[1]);

      const result = await controller.updateAttachment(
        files,
        '1',
        '1',
        '1',
        'Test issue',
        'reporter',
        mockRequest as any
      );

      expect(result.data.uploaded_files).toHaveLength(2);
      expect(result.data.total_uploaded).toBe(2);
    });

    it('should throw BadRequestException when no files uploaded', async () => {
      await expect(
        controller.updateAttachment(
          [],
          '1',
          '1',
          '1',
          'Test issue',
          'reporter',
          mockRequest as any
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when ticket_id missing', async () => {
      await expect(
        controller.updateAttachment(
          [mockFile],
          '',
          '1',
          '1',
          'Test issue',
          'reporter',
          mockRequest as any
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle file processing errors gracefully', async () => {
      const files = [mockFile, { ...mockFile, filename: 'test_2.jpg' }];
      
      attachmentService.create = jest.fn()
        .mockResolvedValueOnce({ ...mockAttachment, id: 1 })
        .mockRejectedValueOnce(new Error('Processing failed'));

      const result = await controller.updateAttachment(
        files,
        '1',
        '1',
        '1',
        'Test issue',
        'reporter',
        mockRequest as any
      );

      expect(result.data.uploaded_files).toHaveLength(1);
      expect(result.data.errors).toHaveLength(1);
      expect(result.message).toContain('with some errors');
    });

    it('should handle complete upload failure', async () => {
      attachmentService.create = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(
        controller.updateAttachment(
          [mockFile],
          '1',
          '1',
          '1',
          'Test issue',
          'reporter',
          mockRequest as any
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle additional data logging', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const createdAttachment = { ...mockAttachment, id: 1 };
      attachmentService.create = jest.fn().mockResolvedValue(createdAttachment);

      await controller.updateAttachment(
        [mockFile],
        '1',
        '2',
        '3',
        'Test issue description',
        'reporter',
        mockRequest as any
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'Additional data to process:',
        {
          project_id: '2',
          categories_id: '3',
          issue_description: 'Test issue description',
          attachment_id: 1,
        }
      );

      consoleSpy.mockRestore();
    });
  });

  describe('deleteAttachment', () => {
    it('should delete attachment successfully', async () => {
      const deleteResponse = {
        code: 0,
        message: 'Attachment deleted successfully',
        data: { id: 1 },
      };

      attachmentService.deleteAttachment = jest.fn().mockResolvedValue(deleteResponse);

      const result = await controller.deleteAttachment(1, mockRequest as any);

      expect(attachmentService.deleteAttachment).toHaveBeenCalledWith(1, 1);
      expect(result).toEqual(deleteResponse);
    });

    it('should handle deletion errors', async () => {
      attachmentService.deleteAttachment = jest.fn().mockRejectedValue(
        new NotFoundException('Attachment not found')
      );

      await expect(
        controller.deleteAttachment(999, mockRequest as any)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('file processing helpers', () => {
    it('should process image correctly', async () => {
      // Access private method through any casting for testing
      const result = await (controller as any).processImage(mockFile);

      expect(result).toEqual({
        filename: 'test_1.jpg',
        path: './uploads/issue_attachment/test_1.jpg',
        size: 1024,
      });
    });

    it('should delete file without throwing error', async () => {
      const mockUnlink = jest.fn().mockResolvedValue(undefined);
      const fs = require('fs');
      fs.promises = { unlink: mockUnlink };

      // Should not throw error
      await (controller as any).deleteFile('/test/path');

      expect(mockUnlink).toHaveBeenCalledWith('/test/path');
    });

    it('should handle file deletion errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockUnlink = jest.fn().mockRejectedValue(new Error('Permission denied'));
      const fs = require('fs');
      fs.promises = { unlink: mockUnlink };

      // Should not throw error even if deletion fails
      await (controller as any).deleteFile('/test/path');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to delete file:',
        '/test/path',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle file system errors in getIssueAttachmentImage', async () => {
      attachmentService.findById = jest.fn().mockResolvedValue(mockAttachment);
      
      const mockStat = jest.fn().mockRejectedValue(new Error('File not found'));
      const { promisify } = require('util');
      promisify.mockImplementation((fn) => {
        if (fn === fs.stat) return mockStat;
        return jest.fn();
      });

      await expect(
        controller.getIssueAttachmentImage(1, mockResponse)
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle unknown file extensions', async () => {
      const unknownAttachment = { ...mockAttachment, extension: 'unknown' };
      attachmentService.findById = jest.fn().mockResolvedValue(unknownAttachment);

      const mockStat = jest.fn().mockResolvedValue({ size: 1024 });
      const mockReadFile = jest.fn().mockResolvedValue(Buffer.from('test'));
      
      const { promisify } = require('util');
      promisify.mockImplementation((fn) => {
        if (fn === fs.stat) return mockStat;
        if (fn === fs.readFile) return mockReadFile;
        return jest.fn();
      });

      await controller.getIssueAttachmentImage(1, mockResponse);

      expect(mockResponse.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': 'attachment; filename="test_1.jpg"',
        })
      );
    });

    it('should handle malformed request parameters', async () => {
      await expect(
        controller.updateAttachment(
          [mockFile],
          'invalid_id',
          '1',
          '1',
          'Test issue',
          'reporter',
          mockRequest as any
        )
      ).rejects.toThrow();
    });

    it('should log console messages during file operations', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      attachmentService.findById = jest.fn().mockResolvedValue(mockAttachment);

      const mockStat = jest.fn().mockResolvedValue({ size: 1024 });
      const mockReadFile = jest.fn().mockResolvedValue(Buffer.from('test'));
      
      const { promisify } = require('util');
      promisify.mockImplementation((fn) => {
        if (fn === fs.stat) return mockStat;
        if (fn === fs.readFile) return mockReadFile;
        return jest.fn();
      });

      await controller.getIssueAttachmentImage(1, mockResponse);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Getting issue attachment file with ID: 1')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('File sent successfully')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('authentication and authorization', () => {
    it('should handle requests with different user ID formats', async () => {
      const requestWithSub = {
        user: { sub: 2, username: 'testuser2' },
        body: { ticket_id: '1', type: 'reporter' },
      };

      const createdAttachment = { ...mockAttachment, id: 1 };
      attachmentService.create = jest.fn().mockResolvedValue(createdAttachment);

      await controller.updateAttachment(
        [mockFile],
        '1',
        '1',
        '1',
        'Test issue',
        'reporter',
        requestWithSub as any
      );

      expect(attachmentService.create).toHaveBeenCalledWith({
        ticket_id: 1,
        type: 'reporter',
        file: mockFile,
        create_by: 2,
      });
    });

    it('should handle requests with userId property', async () => {
      const requestWithUserId = {
        user: { userId: 3, username: 'testuser3' },
        body: { ticket_id: '1', type: 'reporter' },
      };

      const createdAttachment = { ...mockAttachment, id: 1 };
      attachmentService.create = jest.fn().mockResolvedValue(createdAttachment);

      await controller.updateAttachment(
        [mockFile],
        '1',
        '1',
        '1',
        'Test issue',
        'reporter',
        requestWithUserId as any
      );

      expect(attachmentService.create).toHaveBeenCalledWith({
        ticket_id: 1,
        type: 'reporter',
        file: mockFile,
        create_by: 3,
      });
    });
  });
});