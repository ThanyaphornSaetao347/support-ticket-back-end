// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { TicketController } from './ticket.controller';
import { TicketService } from './ticket.service';
import { TicketStatusService } from '../ticket_status/ticket_status.service';
import { NotificationService } from '../notification/notification.service';
import { PermissionService } from '../permission/permission.service';
import { TicketCategoryService } from '../ticket_categories/ticket_categories.service';
import { Request } from 'express';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Ticket } from './entities/ticket.entity';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { of } from 'rxjs';
import { FilesInterceptor } from '@nestjs/platform-express';

// Mock request object with a user
const mockRequest = {
  user: {
    id: 101,
    sub: 101,
    userId: 101,
    permissions: [1, 2, 12, 13], // Mock permissions for testing access
  },
  query: {},
  headers: {
    'accept-language': 'th,en;q=0.9',
  },
  protocol: 'http',
  get: jest.fn().mockReturnValue('localhost:3000'),
} as unknown as Request;

const mockTicket = {
  id: 1,
  ticket_no: 'T-250500001',
  project_id: 1,
  categories_id: 1,
  issue_description: 'Test Issue',
  status_id: 1,
  create_by: 101,
  isenabled: true,
  update_by: 101,
};

describe('TicketController', () => {
  let controller: TicketController;
  let ticketService: jest.Mocked<TicketService>;
  let ticketStatusService: jest.Mocked<TicketStatusService>;
  let notiService: jest.Mocked<NotificationService>;
  let permissionService: jest.Mocked<PermissionService>;
  let ticketRepo: jest.Mocked<Repository<Ticket>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketController],
      providers: [
        {
          provide: getRepositoryToken(Ticket),
          useClass: Repository,
        },
        {
          provide: TicketService,
          useValue: {
            getDashboardStats: jest.fn(),
            saveTicket: jest.fn(),
            getTicketData: jest.fn(),
            getAllTicket: jest.fn(),
            saveSupporter: jest.fn(),
            getAllMasterFilter: jest.fn(),
            updateTicket: jest.fn(),
            softDeleteTicket: jest.fn(),
            restoreTicketByNo: jest.fn(),
            getDeletedTickets: jest.fn(),
            saveSatisfaction: jest.fn(),
            getCategoryBreakdown: jest.fn(),
            checkTicketOwnership: jest.fn(),
            checkTicketOwnershipByNo: jest.fn(),
            checkUserPermissions: jest.fn().mockResolvedValue([1, 2]),
          },
        },
        {
          provide: TicketStatusService,
          useValue: {
            updateTicketStatusAndHistory: jest.fn(),
            getTicketStatusWithName: jest.fn(),
          },
        },
        {
          provide: NotificationService,
          useValue: {
            getNotificationsByType: jest.fn(),
            getUserNotifications: jest.fn(),
            getUnreadCount: jest.fn(),
            markAsRead: jest.fn(),
            markAllAsRead: jest.fn(),
            findNotificationById: jest.fn(),
            isUserSupporter: jest.fn(),
            getTicketNotifications: jest.fn(),
          },
        },
        {
          provide: PermissionService,
          useValue: {}, // We mock the guard, not the service directly
        },
        {
          provide: TicketCategoryService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<TicketController>(TicketController);
    ticketService = module.get(TicketService);
    ticketStatusService = module.get(TicketStatusService);
    notiService = module.get(NotificationService);
    ticketRepo = module.get(getRepositoryToken(Ticket));
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // --- Start of new tests for all endpoints ---

  describe('Language Detection', () => {
    it('should detect language from query parameter', () => {
      const reqWithQuery = { ...mockRequest, query: { lang: 'en' } };
      // @ts-ignore
      const lang = controller['getLanguage'](reqWithQuery);
      expect(lang).toBe('en');
    });

    it('should detect language from custom header', () => {
      const reqWithHeader = { ...mockRequest, headers: { 'x-language': 'th' } };
      // @ts-ignore
      const lang = controller['getLanguage'](reqWithHeader);
      expect(lang).toBe('th');
    });
  });

  describe('getDashboardStats', () => {
    it('should return dashboard stats successfully', async () => {
      jest.spyOn(ticketRepo, 'find')
        .mockResolvedValueOnce([{}, {}]) // total
        .mockResolvedValueOnce([{}]) // new
        .mockResolvedValueOnce([{}]) // inProgress
        .mockResolvedValueOnce([{}]); // complete

      const result = await controller.getDashboardStats();
      expect(result.code).toBe('1');
      expect(result.data.total).toBe(2);
      expect(result.data.new.count).toBe(1);
    });

    it('should handle errors gracefully', async () => {
      jest.spyOn(ticketRepo, 'find').mockRejectedValue(new Error('DB Error'));
      await expect(controller.getDashboardStats()).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('getCategoryBreakdown', () => {
    it('should call service with correct parameters', async () => {
      const mockResult = [{ category: 'Test', count: 10, monthlyCounts: [] }];
      ticketService.getCategoryBreakdown.mockResolvedValue(mockResult);
      const result = await controller.getCategoryBreakdown(mockRequest, '2025', '5');
      expect(ticketService.getCategoryBreakdown).toHaveBeenCalledWith(2025, 5);
      expect(result).toEqual(mockResult);
    });
  });

  describe('saveTicket', () => {
    it('should save a new ticket successfully', async () => {
      const dto = {
        project_id: '1',
        categories_id: '1',
        issue_description: 'New issue',
      };
      const mockResult = {
        ticket_id: 1,
        ticket_no: 'T-250500001',
      };
      ticketService.saveTicket.mockResolvedValue(mockResult);

      const result = await controller.saveTicket(dto, mockRequest);
      expect(result.code).toBe(1);
      expect(result.ticket_no).toBe(mockResult.ticket_no);
      expect(ticketService.saveTicket).toHaveBeenCalled();
    });

    it('should return an error if userId is missing', async () => {
      const reqWithoutUser = { user: null };
      const result = await controller.saveTicket({}, reqWithoutUser);
      expect(result.code).toBe(2);
      expect(result.message).toBe('User not authenticated properly');
    });
  });

  describe('getTicketData', () => {
    it('should get ticket data successfully', async () => {
      const mockData = { ticket_no: 'T-123' };
      ticketService.getTicketData.mockResolvedValue(mockData);
      const result = await controller.getTicketData(
        { ticket_no: 'T-123' },
        mockRequest,
      );
      expect(result.code).toBe(1);
      expect(result.data).toEqual(mockData);
    });
  });

  describe('getAllTicket', () => {
    it('should get all tickets for user', async () => {
      const mockTickets = [mockTicket];
      ticketService.getAllTicket.mockResolvedValue(mockTickets);
      const result = await controller.getAllTicket(mockRequest);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTickets);
      expect(ticketService.getAllTicket).toHaveBeenCalledWith(101);
    });
  });

  describe('saveSupporter', () => {
    it('should save supporter data successfully', async () => {
      ticketService.saveSupporter.mockResolvedValue({ success: true });
      const result = await controller.saveSupporter(
        'T-123',
        { status_id: '3', user_id: '102' },
        [],
        mockRequest,
      );
      expect(result.success).toBe(true);
      expect(ticketService.saveSupporter).toHaveBeenCalled();
    });
  });

  describe('getAllMasterFilter', () => {
    it('should return master filter data', async () => {
      const mockData = { categories: [], projects: [] };
      ticketService.getAllMasterFilter.mockResolvedValue(mockData);
      const result = await controller.getAllMasterFilter(mockRequest);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(ticketService.getAllMasterFilter).toHaveBeenCalledWith(101);
    });
  });

  describe('getTicketByNo', () => {
    it('should get ticket by ticket number', async () => {
      const mockData = { ticket_no: 'T-123' };
      ticketService.getTicketData.mockResolvedValue(mockData);
      const result = await controller.getTicketByNo('T-123', mockRequest);
      expect(result.code).toBe(1);
      expect(result.data).toEqual(mockData);
    });
  });

  describe('updateTicketByNo', () => {
    it('should update ticket successfully', async () => {
      const updateDto = { issue_description: 'Updated' };
      ticketService.updateTicket.mockResolvedValue({ ...mockTicket, ...updateDto });
      const result = await controller.updateTicketByNo('T-123', updateDto, mockRequest);
      expect(result.code).toBe(1);
      expect(result.data.issue_description).toBe('Updated');
    });
  });

  describe('updateTicketStatus', () => {
    it('should update ticket status', async () => {
      const body = { status_id: 3 };
      ticketStatusService.updateTicketStatusAndHistory.mockResolvedValue({ success: true });
      const result = await controller.updateTicketStatus(1, body, mockRequest);
      expect(result.code).toBe(1);
      expect(ticketStatusService.updateTicketStatusAndHistory).toHaveBeenCalledWith(
        1,
        3,
        101,
        undefined,
        undefined,
      );
    });
  });

  describe('deleteTicketByNo', () => {
    it('should soft delete a ticket', async () => {
      ticketService.softDeleteTicket.mockResolvedValue(undefined);
      const result = await controller.deleteTicketByNo('T-123', mockRequest);
      expect(result.code).toBe(1);
      expect(result.message).toBe('ลบตั๋วสำเร็จ');
      expect(ticketService.softDeleteTicket).toHaveBeenCalledWith('T-123', 101);
    });
  });

  describe('restoreTicketByNo', () => {
    it('should restore a ticket', async () => {
      ticketService.restoreTicketByNo.mockResolvedValue(undefined);
      const result = await controller.restoreTicketByNo('T-123', mockRequest);
      expect(result.code).toBe(1);
      expect(result.message).toBe('กู้คืนตั๋วสำเร็จ');
      expect(ticketService.restoreTicketByNo).toHaveBeenCalledWith('T-123', 101);
    });
  });

  describe('softDeleteTicket (get deleted tickets)', () => {
    it('should return a list of deleted tickets', async () => {
      const mockDeletedTickets = [{ ...mockTicket, isenabled: false }];
      ticketService.getDeletedTickets.mockResolvedValue(mockDeletedTickets);
      const result = await controller.softDeleteTicket(mockRequest);
      expect(result.code).toBe(1);
      expect(result.data).toEqual(mockDeletedTickets);
      expect(ticketService.getDeletedTickets).toHaveBeenCalled();
    });
  });

  describe('saveSatisfaction', () => {
    it('should save satisfaction rating successfully', async () => {
      const createDto = { rating: 5, comment: 'Great!' };
      const mockResult = { id: 1, ...createDto };
      ticketService.saveSatisfaction.mockResolvedValue(mockResult);
      const result = await controller.saveSatisfaction(
        'T-123',
        createDto,
        mockRequest,
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
      expect(ticketService.saveSatisfaction).toHaveBeenCalledWith(
        'T-123',
        createDto,
        101,
      );
    });
  });

  describe('getTicketStatus', () => {
    it('should return ticket status successfully', async () => {
      const mockStatus = { status_name: 'Open' };
      // @ts-ignore
      controller['canAccessTicket'] = jest.fn().mockResolvedValue(true);
      ticketStatusService.getTicketStatusWithName.mockResolvedValue(mockStatus);
      const result = await controller.getTicketStatus(1, mockRequest);
      expect(result.code).toBe(1);
      expect(result.data.status_name).toBe('Open');
    });

    it('should throw ForbiddenException if user has no access', async () => {
      // @ts-ignore
      controller['canAccessTicket'] = jest.fn().mockResolvedValue(false);
      await expect(controller.getTicketStatus(1, mockRequest)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getUserNotification', () => {
    it('should return all notifications for a user', async () => {
      const mockNoti = [{ id: 1 }];
      notiService.getUserNotifications.mockResolvedValue(mockNoti);
      const result = await controller.getUserNotification(mockRequest, '1', '10');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockNoti);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      notiService.getUnreadCount.mockResolvedValue(5);
      const result = await controller.getUnreadCount(mockRequest);
      expect(result.success).toBe(true);
      expect(result.data.unread_count).toBe(5);
    });
  });

  describe('getAllType', () => {
    it('should return all notification types', async () => {
      const result = await controller.getNotificationType();
      expect(result.success).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
    });
  });

  describe('getNotificationById', () => {
    it('should return a notification by id', async () => {
      const mockNoti = { id: 1, user_id: 101 };
      notiService.findNotificationById.mockResolvedValue(mockNoti);
      const result = await controller.getNotificationById(1, mockRequest);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockNoti);
    });
  });

  describe('getTicketNotifications', () => {
    it('should return notifications for a ticket', async () => {
      // @ts-ignore
      controller['canAccessTicketByNo'] = jest.fn().mockResolvedValue(true);
      const mockNoti = [{ id: 1 }];
      notiService.getTicketNotifications.mockResolvedValue(mockNoti);
      const result = await controller.getTicketNotifications('T-123', mockRequest);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockNoti);
    });
  });

  describe('markAsRead', () => {
    it('should mark a single notification as read', async () => {
      notiService.markAsRead.mockResolvedValue({ affected: 1 });
      const result = await controller.markAsRead(1, mockRequest);
      expect(result.success).toBe(true);
      expect(notiService.markAsRead).toHaveBeenCalledWith(1, 101);
    });
  });

  describe('markAllRead', () => {
    it('should mark all notifications as read', async () => {
      notiService.markAllAsRead.mockResolvedValue({ updated: 5 });
      const result = await controller.markAllRead(mockRequest);
      expect(result.success).toBe(true);
      expect(result.data.update_count).toBe(5);
      expect(notiService.markAllAsRead).toHaveBeenCalledWith(101);
    });
  });
});