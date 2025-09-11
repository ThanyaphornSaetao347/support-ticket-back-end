import { Test, TestingModule } from '@nestjs/testing';
import { TicketAssignedService } from './ticket_assigned.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketAssigned } from './entities/ticket_assigned.entity';
import { Ticket } from '../ticket/entities/ticket.entity';
import { Users } from '../users/entities/user.entity';
import { PermissionService } from '../permission/permission.service';
import { NotificationService } from '../notification/notification.service';
import { UserAllowRoleService } from '../user_allow_role/user_allow_role.service';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';

const mockTicketAssignedRepository = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
};

const mockTicketRepository = {
  findOne: jest.fn(),
};

const mockUsersRepository = {
  findOne: jest.fn(),
  findOneBy: jest.fn(),
};

const mockPermissionService = {
  canAssignTicket: jest.fn(),
  getUserPermissionInfo: jest.fn(),
};

const mockNotificationService = {
  createAssignmentNotification: jest.fn(),
};

const mockUserAllowRoleService = {
  getUsersByRole: jest.fn(),
};

describe('TicketAssignedService', () => {
  let service: TicketAssignedService;
  let ticketRepo: typeof mockTicketRepository;
  let assignRepo: typeof mockTicketAssignedRepository;
  let userRepo: typeof mockUsersRepository;
  let permissionService: typeof mockPermissionService;
  let notiService: typeof mockNotificationService;
  let allowRoleService: typeof mockUserAllowRoleService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketAssignedService,
        {
          provide: getRepositoryToken(Ticket),
          useValue: mockTicketRepository,
        },
        {
          provide: getRepositoryToken(TicketAssigned),
          useValue: mockTicketAssignedRepository,
        },
        {
          provide: getRepositoryToken(Users),
          useValue: mockUsersRepository,
        },
        {
          provide: PermissionService,
          useValue: mockPermissionService,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
        {
          provide: UserAllowRoleService,
          useValue: mockUserAllowRoleService,
        },
      ],
    }).compile();

    service = module.get<TicketAssignedService>(TicketAssignedService);
    ticketRepo = module.get(getRepositoryToken(Ticket));
    assignRepo = module.get(getRepositoryToken(TicketAssigned));
    userRepo = module.get(getRepositoryToken(Users));
    permissionService = module.get(PermissionService);
    notiService = module.get(NotificationService);
    allowRoleService = module.get(UserAllowRoleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('assignTicketByTicketNo', () => {
    // New test case to cover the 'Cannot read properties of undefined' error
    it('should throw ForbiddenException if user has no permission', async () => {
      mockPermissionService.canAssignTicket.mockResolvedValue(false);
      mockPermissionService.getUserPermissionInfo.mockResolvedValue({ permissions: [{ permissionId: 19 }] });
      mockUserAllowRoleService.getUsersByRole.mockResolvedValue([]);
      await expect(service.assignTicketByTicketNo('T-001', 2, 1)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if ticket is not found', async () => {
      mockPermissionService.canAssignTicket.mockResolvedValue(true);
      mockPermissionService.getUserPermissionInfo.mockResolvedValue({ permissions: [{ permissionId: 19 }] });
      mockTicketRepository.findOne.mockResolvedValue(null);
      mockUserAllowRoleService.getUsersByRole.mockResolvedValue([]);
      await expect(service.assignTicketByTicketNo('T-001', 2, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if assignedTo user is not found', async () => {
      mockPermissionService.canAssignTicket.mockResolvedValue(true);
      mockPermissionService.getUserPermissionInfo.mockResolvedValue({ permissions: [{ permissionId: 19 }] });
      mockTicketRepository.findOne.mockResolvedValue({ id: 1, ticket_no: 'T-001' });
      mockUsersRepository.findOne.mockResolvedValue(null);
      mockUserAllowRoleService.getUsersByRole.mockResolvedValue([]); // Add mock for this line
      await expect(service.assignTicketByTicketNo('T-001', 99, 1)).rejects.toThrow(NotFoundException);
    });
    
    it('should throw BadRequestException if assignedTo user is not in role 9', async () => {
      mockPermissionService.canAssignTicket.mockResolvedValue(true);
      mockPermissionService.getUserPermissionInfo.mockResolvedValue({ permissions: [{ permissionId: 19 }] });
      mockTicketRepository.findOne.mockResolvedValue({ id: 1, ticket_no: 'T-001' });
      mockUsersRepository.findOne.mockResolvedValue({ id: 99, firstname: 'Invalid', lastname: 'User' });
      mockUserAllowRoleService.getUsersByRole.mockResolvedValue([{ id: 2, firstname: 'Valid', lastname: 'User' }]);
      await expect(service.assignTicketByTicketNo('T-001', 99, 1)).rejects.toThrow(BadRequestException);
    });

    it('should assign ticket and return success message', async () => {
      const mockTicket = { id: 1, ticket_no: 'T-001' };
      const mockAssignee = { id: 2, firstname: 'Assigned', lastname: 'User' };
      const mockAssignor = { id: 1, firstname: 'Assigning', lastname: 'User' };
      const mockRole9Users = [{ id: 2, firstname: 'Assigned', lastname: 'User' }];
      const mockPermissionInfo = {
        permissions: [{ permissionId: 19 }]
      };

      mockPermissionService.canAssignTicket.mockResolvedValue(true);
      mockPermissionService.getUserPermissionInfo.mockResolvedValue(mockPermissionInfo);
      mockTicketRepository.findOne.mockResolvedValue(mockTicket);
      mockUsersRepository.findOne.mockResolvedValue(mockAssignee);
      mockUsersRepository.findOneBy.mockResolvedValue(mockAssignor);
      mockTicketAssignedRepository.findOne.mockResolvedValue(null);
      mockUserAllowRoleService.getUsersByRole.mockResolvedValue(mockRole9Users);
      mockTicketAssignedRepository.create.mockReturnValue({});
      mockTicketAssignedRepository.save.mockResolvedValue({});
      mockNotificationService.createAssignmentNotification.mockResolvedValue({});

      const result = await service.assignTicketByTicketNo('T-001', 2, 1);

      expect(mockTicketAssignedRepository.save).toHaveBeenCalled();
      expect(result).toEqual({
        message: 'มอบหมายงานสำเร็จ',
        ticket_no: 'T-001',
        assigned_to: 2,
        assignee_name: 'Assigned User',
        available_users: ['Assigned User'],
      });
    });
  });
});