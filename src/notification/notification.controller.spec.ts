import { Test, TestingModule } from '@nestjs/testing';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { NotificationType } from './entities/notification.entity';

describe('NotificationController', () => {
  let controller: NotificationController;
  let service: NotificationService;

  const mockNotificationService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    createNotification: jest.fn(),
    createStatusChangeNotification: jest.fn(),
    createNewTicketNotification: jest.fn(),
    createAssignmentNotification: jest.fn(),
    getUserNotifications: jest.fn(),
    getUnreadNotifications: jest.fn(),
    updateNotificationStatus: jest.fn(),
    deleteOldNotifications: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    controller = module.get<NotificationController>(NotificationController);
    service = module.get<NotificationService>(NotificationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call notificationService.create with the correct DTO', async () => {
      const createDto: CreateNotificationDto = {
        ticket_no: 'T12345',
        user_id: 1,
        notification_type: NotificationType.NEW_TICKET,
        title: 'New Test Ticket',
      };
      await controller.create(createDto);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should call notificationService.findAll', async () => {
      await controller.findAll();
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should call notificationService.findOne with the parsed ID', async () => {
      const id = '1';
      await controller.findOne(id);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('update', () => {
    it('should call notificationService.update with the parsed ID and DTO', async () => {
      const id = '1';
      const updateDto: UpdateNotificationDto = { is_read: true };
      await controller.update(id, updateDto);
      expect(service.update).toHaveBeenCalledWith(1, updateDto);
    });
  });

  describe('remove', () => {
    it('should call notificationService.remove with the parsed ID', async () => {
      const id = '1';
      await controller.remove(id);
      expect(service.remove).toHaveBeenCalledWith(1);
    });
  });
});