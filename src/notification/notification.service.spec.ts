import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { Users } from '../users/entities/user.entity';
import { Ticket } from '../ticket/entities/ticket.entity';
import { TicketStatus } from '../ticket_status/entities/ticket_status.entity';
import { TicketAssigned } from '../ticket_assigned/entities/ticket_assigned.entity';
import { UserAllowRole } from '../user_allow_role/entities/user_allow_role.entity';
import { Repository } from 'typeorm';
import { MailerService } from '@nestjs-modules/mailer';
import { NotFoundException } from '@nestjs/common';

describe('NotificationService', () => {
  let service: NotificationService;
  let notificationRepository: Repository<Notification>;
  let userRepository: Repository<Users>;
  let ticketRepository: Repository<Ticket>;
  let mailerService: MailerService;

  const mockNotificationRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    findByIds: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockTicketRepository = {
    findOne: jest.fn(),
  };

  const mockTicketStatusRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockTicketAssignedRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockUserAllowRoleRepository = {
    find: jest.fn(),
  };

  const mockMailerService = {
    sendMail: jest.fn(),
  };

  const mockNotification = {
    id: 1,
    ticket_no: 'T2501001',
    user_id: 1,
    notification_type: NotificationType.NEW_TICKET,
    title: 'เรื่องใหม่: #1',
    message: 'มีเรื่องใหม่ที่ต้องการการดำเนินการ',
    is_read: false,
    email_sent: false,
    create_date: new Date(),
  };

  const mockUser = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    firstname: 'Test',
    lastname: 'User',
  };

  const mockTicket = {
    id: 1,
    ticket_no: 'T2501001',
    categories_id: 1,
    issue_description: 'Test issue',
    create_by: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: getRepositoryToken(Notification),
          useValue: mockNotificationRepository,
        },
        {
          provide: getRepositoryToken(Users),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Ticket),
          useValue: mockTicketRepository,
        },
        {
          provide: getRepositoryToken(TicketStatus),
          useValue: mockTicketStatusRepository,
        },
        {
          provide: getRepositoryToken(TicketAssigned),
          useValue: mockTicketAssignedRepository,
        },
        {
          provide: getRepositoryToken(UserAllowRole),
          useValue: mockUserAllowRoleRepository,
        },
        {
          provide: MailerService,
          useValue: mockMailerService,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    notificationRepository = module.get<Repository<Notification>>(
      getRepositoryToken(Notification),
    );
    userRepository = module.get<Repository<Users>>(getRepositoryToken(Users));
    ticketRepository = module.get<Repository<Ticket>>(getRepositoryToken(Ticket));
    mailerService = module.get<MailerService>(MailerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    const createNotificationDto = {
      ticket_no: 'T2501001',
      user_id: 1,
      notification_type: NotificationType.NEW_TICKET,
      title: 'Test notification',
      message: 'Test message',
    };

    it('should create notification successfully', async () => {
      mockNotificationRepository.create.mockReturnValue(mockNotification);
      mockNotificationRepository.save.mockResolvedValue(mockNotification);

      const result = await service.createNotification(createNotificationDto);

      expect(result).toEqual(mockNotification);
      expect(mockNotificationRepository.create).toHaveBeenCalledWith({
        ticket_no: 'T2501001',
        user_id: 1,
        notification_type: NotificationType.NEW_TICKET,
        title: 'Test notification',
        message: 'Test message',
        is_read: false,
        email_sent: false,
        status_id: undefined,
      });
    });
  });

  describe('createStatusChangeNotification', () => {
    it('should create status change notification successfully', async () => {
      const mockStatus = {
        id: 2,
        name: 'In Progress',
      };

      mockTicketRepository.findOne.mockResolvedValue(mockTicket);
      mockTicketStatusRepository.findOne.mockResolvedValue(mockStatus);
      
      const mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ name: 'กำลังดำเนินการ' }),
      };
      mockTicketStatusRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      mockNotificationRepository.create.mockReturnValue(mockNotification);
      mockNotificationRepository.save.mockResolvedValue(mockNotification);

      // Mock sendEmailNotification as a private method
      jest.spyOn(service as any, 'sendEmailNotification').mockResolvedValue(undefined);

      const result = await service.createStatusChangeNotification('T2501001', 2);

      expect(result).toEqual(mockNotification);
      expect(mockTicketRepository.findOne).toHaveBeenCalledWith({
        where: { ticket_no: 'T2501001' },
      });
    });

    it('should throw NotFoundException if ticket not found', async () => {
      mockTicketRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createStatusChangeNotification('INVALID', 2),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createNewTicketNotification', () => {
    it('should create new ticket notification for supporters', async () => {
      const supporterUsers = [
        { id: 1, email: 'supporter1@example.com' },
        { id: 2, email: 'supporter2@example.com' },
      ];

      mockTicketRepository.findOne.mockResolvedValue(mockTicket);
      
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { user_id: 1 },
          { user_id: 2 },
        ]),
      };
      mockUserRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockUserRepository.findByIds.mockResolvedValue(supporterUsers);

      mockNotificationRepository.create.mockReturnValue(mockNotification);
      mockNotificationRepository.save.mockResolvedValue(mockNotification);

      jest.spyOn(service as any, 'sendEmailNotification').mockResolvedValue(undefined);

      const result = await service.createNewTicketNotification('T2501001');

      expect(result).toHaveLength(2);
      expect(mockNotificationRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should handle case when no supporters found', async () => {
      mockTicketRepository.findOne.mockResolvedValue(mockTicket);
      
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      mockUserRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.createNewTicketNotification('T2501001');

      expect(result).toEqual([]);
    });
  });

  describe('createAssignmentNotification', () => {
    it('should create assignment notification successfully', async () => {
      mockTicketRepository.findOne.mockResolvedValue(mockTicket);
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockNotificationRepository.create.mockReturnValue(mockNotification);
      mockNotificationRepository.save.mockResolvedValue(mockNotification);

      jest.spyOn(service as any, 'sendEmailNotification').mockResolvedValue(undefined);

      const result = await service.createAssignmentNotification('T2501001', 1);

      expect(result).toEqual(mockNotification);
      expect(mockTicketRepository.findOne).toHaveBeenCalledWith({
        where: { ticket_no: 'T2501001' },
      });
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundException if assigned user not found', async () => {
      mockTicketRepository.findOne.mockResolvedValue(mockTicket);
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createAssignmentNotification('T2501001', 999),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserNotifications', () => {
    it('should get user notifications successfully', async () => {
      const mockNotifications = [mockNotification];
      
      mockNotificationRepository.findAndCount.mockResolvedValue([
        mockNotifications,
        1,
      ]);

      const result = await service.getUserNotifications(1, 1, 20);

      expect(result).toEqual({
        notifications: mockNotifications,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
      expect(mockNotificationRepository.findAndCount).toHaveBeenCalledWith({
        where: { user_id: 1 },
        relations: ['user', 'ticket', 'status'],
        order: { create_date: 'DESC' },
        skip: 0,
        take: 20,
      });
    });

    it('should handle invalid parameters', async () => {
      await expect(service.getUserNotifications(0, 1, 20)).rejects.toThrow(
        'Invalid user ID',
      );
    });

    it('should adjust page and limit parameters', async () => {
      mockNotificationRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.getUserNotifications(1, -1, 200);

      expect(mockNotificationRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0, // page adjusted to 1
          take: 20, // limit adjusted to 20
        }),
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read successfully', async () => {
      const unreadNotification = { ...mockNotification, is_read: false };
      const readNotification = { ...mockNotification, is_read: true };

      mockNotificationRepository.findOne
        .mockResolvedValueOnce(unreadNotification)
        .mockResolvedValueOnce(readNotification);
      mockNotificationRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.markAsRead(1, 1);

      expect(result).toEqual(readNotification);
      expect(mockNotificationRepository.update).toHaveBeenCalledWith(1, {
        is_read: true,
        read_at: expect.any(Date),
      });
    });

    it('should return notification if already read', async () => {
      const readNotification = { ...mockNotification, is_read: true };

      mockNotificationRepository.findOne.mockResolvedValue(readNotification);

      const result = await service.markAsRead(1, 1);

      expect(result).toEqual(readNotification);
      expect(mockNotificationRepository.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if notification not found', async () => {
      mockNotificationRepository.findOne.mockResolvedValue(null);

      await expect(service.markAsRead(999, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read successfully', async () => {
      mockNotificationRepository.update.mockResolvedValue({ affected: 5 });

      const result = await service.markAllAsRead(1);

      expect(result).toEqual({ updated: 5 });
      expect(mockNotificationRepository.update).toHaveBeenCalledWith(
        { user_id: 1, is_read: false },
        { is_read: true, read_at: expect.any(Date) },
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should get unread count successfully', async () => {
      mockNotificationRepository.count.mockResolvedValue(3);

      const result = await service.getUnreadCount(1);

      expect(result).toBe(3);
      expect(mockNotificationRepository.count).toHaveBeenCalledWith({
        where: { user_id: 1, is_read: false },
      });
    });

    it('should return 0 for invalid user ID', async () => {
      const result = await service.getUnreadCount(0);

      expect(result).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      mockNotificationRepository.count.mockRejectedValue(new Error('DB Error'));

      const result = await service.getUnreadCount(1);

      expect(result).toBe(0);
    });
  });

  describe('getNotificationsByType', () => {
    it('should get notifications by type successfully', async () => {
      const mockNotifications = [
        { ...mockNotification, notification_type: NotificationType.NEW_TICKET },
      ];
      
      mockNotificationRepository.findAndCount.mockResolvedValue([
        mockNotifications,
        1,
      ]);

      const result = await service.getNotificationsByType(
        1,
        NotificationType.NEW_TICKET,
        1,
        20,
      );

      expect(result).toEqual({
        notifications: mockNotifications,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
      expect(mockNotificationRepository.findAndCount).toHaveBeenCalledWith({
        where: { user_id: 1, notification_type: NotificationType.NEW_TICKET },
        relations: ['user', 'ticket', 'status'],
        order: { create_date: 'DESC' },
        skip: 0,
        take: 20,
      });
    });
  });

  describe('isUserSupporter', () => {
    it('should return true if user is supporter', async () => {
      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUser),
      };
      mockUserRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.isUserSupporter(1);

      expect(result).toBe(true);
    });

    it('should return false if user is not supporter', async () => {
      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      mockUserRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.isUserSupporter(1);

      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockRejectedValue(new Error('DB Error')),
      };
      mockUserRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.isUserSupporter(1);

      expect(result).toBe(false);
    });
  });

  describe('sendEmailWithHtml', () => {
    it('should send email successfully', async () => {
      mockMailerService.sendMail.mockResolvedValue(true);

      const result = await service['sendEmailWithHtml'](
        'test@example.com',
        'Test Subject',
        '<h1>Test HTML</h1>',
      );

      expect(result).toBe(true);
      expect(mockMailerService.sendMail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<h1>Test HTML</h1>',
      });
    });

    it('should return false for invalid email format', async () => {
      const result = await service['sendEmailWithHtml'](
        'invalid-email',
        'Test Subject',
        '<h1>Test HTML</h1>',
      );

      expect(result).toBe(false);
      expect(mockMailerService.sendMail).not.toHaveBeenCalled();
    });

    it('should handle email sending errors', async () => {
      mockMailerService.sendMail.mockRejectedValue(new Error('Email Error'));

      const result = await service['sendEmailWithHtml'](
        'test@example.com',
        'Test Subject',
        '<h1>Test HTML</h1>',
      );

      expect(result).toBe(false);
    });
  });

  describe('deleteOldNotifications', () => {
    it('should delete old notifications successfully', async () => {
      const mockQueryBuilder = {
        delete: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 10 }),
      };
      mockNotificationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.deleteOldNotifications(90);

      expect(result).toEqual({ deleted: 10 });
    });

    it('should throw error for invalid days parameter', async () => {
      await expect(service.deleteOldNotifications(0)).rejects.toThrow(
        'Days old must be greater than 0',
      );
    });
  });

  describe('should be defined', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });
});