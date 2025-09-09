// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { TicketService } from './ticket.service';
import { Ticket } from './entities/ticket.entity';
import { TicketStatusHistory } from '../ticket_status_history/entities/ticket_status_history.entity';
import { TicketAttachment } from '../ticket_attachment/entities/ticket_attachment.entity';
import { TicketCategory } from '../ticket_categories/entities/ticket_category.entity';
import { TicketStatus } from '../ticket_status/entities/ticket_status.entity';
import { Satisfaction } from '../satisfaction/entities/satisfaction.entity';
import { Users } from '../users/entities/user.entity';
import { TicketAssigned } from '../ticket_assigned/entities/ticket_assigned.entity';
import { Project } from '../project/entities/project.entity';
import { AttachmentService } from '../ticket_attachment/ticket_attachment.service';
import { TicketStatusHistoryService } from '../ticket_status_history/ticket_status_history.service';
import { NotificationService } from '../notification/notification.service';
import { PermissionService } from '../permission/permission.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

describe('TicketService', () => {
  let service: TicketService;
  let ticketRepo: jest.Mocked<Repository<Ticket>>;
  let historyRepo: jest.Mocked<Repository<TicketStatusHistory>>;
  let attachmentRepo: jest.Mocked<Repository<TicketAttachment>>;
  let categoryRepo: jest.Mocked<Repository<TicketCategory>>;
  let projectRepo: jest.Mocked<Repository<Project>>;
  let statusRepo: jest.Mocked<Repository<TicketStatus>>;
  let satisfactionRepo: jest.Mocked<Repository<Satisfaction>>;
  let userRepo: jest.Mocked<Repository<Users>>;
  let assignRepo: jest.Mocked<Repository<TicketAssigned>>;
  let attachmentService: jest.Mocked<AttachmentService>;
  let historyService: jest.Mocked<TicketStatusHistoryService>;
  let notiService: jest.Mocked<NotificationService>;
  let permissionService: jest.Mocked<PermissionService>;
  let dataSource: jest.Mocked<DataSource>;

  const mockTicket = {
    id: 1,
    ticket_no: 'T-250500001',
    project_id: 1,
    categories_id: 1,
    issue_description: 'Test Issue',
    status_id: 1,
    create_by: 101,
    update_by: 101,
    isenabled: true,
    create_date: new Date(),
    update_date: new Date(),
  };

  const mockTicketRaw = {
    ...mockTicket,
    categories_name: 'Test Category',
    project_name: 'Test Project',
    status_name: 'New',
    create_by: 'John Doe',
    update_by: 'John Doe',
  };

  const mockCreateTicketDto: CreateTicketDto = {
    project_id: 1,
    categories_id: 1,
    issue_description: 'Test Issue',
  };

  const mockUpdateTicketDto: UpdateTicketDto = {
    issue_description: 'Updated issue',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketService,
        {
          provide: getRepositoryToken(Ticket),
          useValue: {
            create: jest.fn().mockReturnValue(mockTicket),
            save: jest.fn().mockResolvedValue(mockTicket),
            findOne: jest.fn().mockResolvedValue(mockTicket),
            find: jest.fn().mockResolvedValue([mockTicket]),
            findAndCount: jest.fn().mockResolvedValue([[mockTicket], 1]),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
            createQueryBuilder: jest.fn().mockReturnValue({
              leftJoin: jest.fn().mockReturnThis(),
              innerJoin: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              select: jest.fn().mockReturnThis(),
              addSelect: jest.fn().mockReturnThis(),
              getRawOne: jest.fn().mockResolvedValue(mockTicketRaw),
              getRawMany: jest.fn().mockResolvedValue([]),
              getCount: jest.fn().mockResolvedValue(1),
              orderBy: jest.fn().mockReturnThis(),
              getOne: jest.fn().mockResolvedValue(null),
              getMany: jest.fn().mockResolvedValue([]),
              groupBy: jest.fn().mockReturnThis(),
              addGroupBy: jest.fn().mockReturnThis(),
            }),
          },
        },
        {
          provide: getRepositoryToken(TicketStatusHistory),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn().mockResolvedValue(null),
            createQueryBuilder: jest.fn().mockReturnValue({
              leftJoin: jest.fn().mockReturnThis(),
              select: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              getRawMany: jest.fn().mockResolvedValue([]),
            }),
          },
        },
        {
          provide: getRepositoryToken(TicketAttachment),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getRawMany: jest.fn().mockResolvedValue([]),
            }),
          },
        },
        { provide: getRepositoryToken(TicketCategory), useValue: {} },
        { provide: getRepositoryToken(Project), useValue: {} },
        { provide: getRepositoryToken(TicketStatus), useValue: {} },
        { provide: getRepositoryToken(Satisfaction), useValue: {} },
        {
          provide: getRepositoryToken(Users),
          useValue: {
            findByIds: jest.fn().mockResolvedValue([{ id: 102 }]),
            createQueryBuilder: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnThis(),
              innerJoin: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              getRawMany: jest.fn().mockResolvedValue([{ id: 102 }]),
            }),
          },
        },
        {
          provide: getRepositoryToken(TicketAssigned),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue({
              leftJoin: jest.fn().mockReturnThis(),
              select: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              getRawMany: jest.fn().mockResolvedValue([]),
            }),
          },
        },
        {
          provide: AttachmentService,
          useValue: {
            softDeleteAllByTicketId: jest.fn(),
            restoreAllByTicketId: jest.fn(),
          },
        },
        {
          provide: TicketStatusHistoryService,
          useValue: {
            createHistory: jest.fn(),
          },
        },
        {
          provide: NotificationService,
          useValue: {
            createNewTicketNotification: jest.fn(),
          },
        },
        {
          provide: PermissionService,
          useValue: {
            checkUserPermissions: jest.fn().mockResolvedValue([1, 13]),
          },
        },
        {
          provide: DataSource,
          useValue: {
            query: jest.fn().mockResolvedValue([{ id: 1, create_by: 101 }]),
            createQueryBuilder: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnThis(),
              from: jest.fn().mockReturnThis(),
              leftJoin: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              setParameter: jest.fn().mockReturnThis(),
              getRawOne: jest.fn(),
            }),
          },
        },
      ],
    }).compile();

    service = module.get<TicketService>(TicketService);
    ticketRepo = module.get(getRepositoryToken(Ticket));
    historyRepo = module.get(getRepositoryToken(TicketStatusHistory));
    attachmentRepo = module.get(getRepositoryToken(TicketAttachment));
    userRepo = module.get(getRepositoryToken(Users));
    notiService = module.get(NotificationService);
    permissionService = module.get(PermissionService);
    dataSource = module.get(DataSource);

    // Mock the createQueryBuilder methods to handle different calls
    jest
      .spyOn(ticketRepo, 'createQueryBuilder')
      .mockReturnValue({
        leftJoin: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(mockTicketRaw),
        getRawMany: jest.fn().mockResolvedValue([]),
        getCount: jest.fn().mockResolvedValue(1),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockTicket),
        getMany: jest.fn().mockResolvedValue([mockTicket]),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
      } as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // --- Core Methods ---
  describe('saveTicket', () => {
    it('should create a new ticket successfully', async () => {
      jest.spyOn(service, 'generateTicketNumber').mockResolvedValue('T250500002');
      jest.spyOn(ticketRepo, 'save').mockResolvedValue({
        id: 2,
        ...mockTicket,
        ticket_no: 'T250500002',
      });
      const result = await service.saveTicket(mockCreateTicketDto, 101);
      expect(result.ticket_no).toBe('T250500002');
      expect(ticketRepo.create).toHaveBeenCalled();
      expect(ticketRepo.save).toHaveBeenCalled();
      expect(historyRepo.create).toHaveBeenCalled();
      expect(historyRepo.save).toHaveBeenCalled();
    });

    it('should update an existing ticket successfully', async () => {
      const existingTicket = { ...mockTicket, status_id: 2 };
      jest.spyOn(ticketRepo, 'findOne').mockResolvedValue(existingTicket);
      const updateDto = { ...mockCreateTicketDto, ticket_id: 1, status_id: 3 };
      const result = await service.saveTicket(updateDto, 101);
      expect(ticketRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(ticketRepo.save).toHaveBeenCalled();
      expect(historyRepo.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if ticket_id for update is not found', async () => {
      jest.spyOn(ticketRepo, 'findOne').mockResolvedValue(null);
      await expect(
        service.saveTicket({ ticket_id: 999 }, 101),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getTicketData', () => {
    it('should return ticket data with attachments and history', async () => {
      const mockAttachments = [
        { attachment_id: 1, extension: 'png', filename: 'test.png' },
      ];
      const mockHistory = [{ status_id: 1, status_name: 'New' }];
      jest.spyOn(attachmentRepo, 'createQueryBuilder').mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(mockAttachments),
      } as any);
      jest.spyOn(historyRepo, 'createQueryBuilder').mockReturnValueOnce({
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(mockHistory),
      } as any);
      const result = await service.getTicketData('T-250500001', 'http://localhost');
      expect(result.ticket.ticket_no).toBe('T-250500001');
      expect(result.issue_attachment.length).toBe(1);
      expect(result.status_history.length).toBe(1);
    });

    it('should throw NotFoundException if ticket not found', async () => {
      jest
        .spyOn(ticketRepo, 'createQueryBuilder')
        .mockReturnValue({ getRawOne: jest.fn().mockResolvedValue(null) } as any);
      await expect(
        service.getTicketData('T-999999999', 'http://localhost'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAllTicket', () => {
    it('should return all tickets for a user with VIEW_ALL_TICKETS permission', async () => {
      jest
        .spyOn(permissionService, 'checkUserPermissions')
        .mockResolvedValueOnce([13]);
      jest.spyOn(ticketRepo, 'findAndCount').mockResolvedValue([
        [mockTicket],
        1,
      ]);
      const result = await service.getAllTicket(101);
      expect(result.length).toBe(1);
    });

    it('should return only user-owned tickets without VIEW_ALL_TICKETS permission', async () => {
      jest
        .spyOn(permissionService, 'checkUserPermissions')
        .mockResolvedValueOnce([1]);
      jest.spyOn(ticketRepo, 'findAndCount').mockResolvedValue([
        [mockTicket],
        1,
      ]);
      const result = await service.getAllTicket(101);
      expect(result.length).toBe(1);
    });
  });

  describe('softDeleteTicket', () => {
    it('should soft delete a ticket successfully', async () => {
      jest.spyOn(ticketRepo, 'findOne').mockResolvedValue(mockTicket);
      await service.softDeleteTicket('T-250500001', 101);
      expect(ticketRepo.findOne).toHaveBeenCalled();
      expect(ticketRepo.save).toHaveBeenCalledWith({
        ...mockTicket,
        isenabled: false,
        update_by: 101,
      });
    });

    it('should throw ForbiddenException if user is not the owner', async () => {
      jest.spyOn(ticketRepo, 'findOne').mockResolvedValue({
        ...mockTicket,
        create_by: 999,
      });
      await expect(
        service.softDeleteTicket('T-250500001', 101),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('restoreTicketByNo', () => {
    it('should restore a soft-deleted ticket successfully', async () => {
      const deletedTicket = { ...mockTicket, isenabled: false };
      jest.spyOn(ticketRepo, 'findOne').mockResolvedValue(deletedTicket);
      await service.restoreTicketByNo('T-250500001', 101);
      expect(ticketRepo.findOne).toHaveBeenCalled();
      expect(ticketRepo.save).toHaveBeenCalledWith({
        ...deletedTicket,
        isenabled: true,
        update_by: 101,
      });
    });

    it('should throw NotFoundException if deleted ticket not found', async () => {
      jest.spyOn(ticketRepo, 'findOne').mockResolvedValue(null);
      await expect(
        service.restoreTicketByNo('T-999999999', 101),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDeletedTickets', () => {
    it('should return a list of deleted tickets', async () => {
      const deletedTicket = {
        ...mockTicket,
        isenabled: false,
        update_date: new Date(),
      };
      jest.spyOn(ticketRepo, 'find').mockResolvedValue([deletedTicket]);
      const result = await service.getDeletedTickets();
      expect(result.length).toBe(1);
      expect(result[0].can_restore).toBe(true);
    });
  });

  describe('generateTicketNumber', () => {
    it('should generate a new ticket number correctly', async () => {
      jest.spyOn(ticketRepo.createQueryBuilder(), 'getOne').mockResolvedValue({
        ticket_no: 'T' + new Date().getFullYear().toString().slice(-2) + (new Date().getMonth() + 1).toString().padStart(2, '0') + '00000',
      });
      const ticketNo = await service.generateTicketNumber();
      expect(ticketNo).toMatch(/^T\d{2}\d{2}\d{5}$/);
    });
  });

  // --- Helper & Utility Methods ---
  describe('checkTicketOwnership', () => {
    it('should return true if user is the ticket owner', async () => {
      jest
        .spyOn(dataSource, 'query')
        .mockResolvedValueOnce([{ id: 1, create_by: 101 }]);
      const result = await service.checkTicketOwnership(101, 1, []);
      expect(result).toBe(true);
    });

    it('should return true if user has a valid permission', async () => {
      const result = await service.checkTicketOwnership(999, 1, [13]);
      expect(result).toBe(true);
    });

    it('should return false if user has no permission and is not the owner', async () => {
      jest.spyOn(dataSource, 'query').mockResolvedValueOnce([]);
      const result = await service.checkTicketOwnership(999, 1, []);
      expect(result).toBe(false);
    });
  });

  describe('notifySupporters', () => {
    it('should call createNewTicketNotification for each supporter', async () => {
      jest
        .spyOn(userRepo, 'createQueryBuilder')
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getRawMany: jest.fn().mockResolvedValue([{ id: 102 }, { id: 103 }]),
        } as any);
      jest.spyOn(userRepo, 'findByIds').mockResolvedValue([
        { id: 102, email: 'supporter1@test.com' },
        { id: 103, email: 'supporter2@test.com' },
      ]);
      // @ts-ignore
      await service['notifySupporters'](mockTicket);
      expect(notiService.createNewTicketNotification).toHaveBeenCalledTimes(2);
    });
  });
});