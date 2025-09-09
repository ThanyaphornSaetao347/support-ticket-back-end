import { Test, TestingModule } from '@nestjs/testing';
import { CustomerForProjectService } from './customer_for_project.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerForProject } from './entities/customer-for-project.entity';
import { Project } from '../project/entities/project.entity';
import { Customer } from '../customer/entities/customer.entity';
import { CreateCustomerForProjectDto } from './dto/create-customer_for_project.dto';
import { UpdateCustomerForProjectDto } from './dto/update-customer_for_project.dto';

describe('CustomerForProjectService', () => {
  let service: CustomerForProjectService;
  let customerForProjectRepository: jest.Mocked<Repository<CustomerForProject>>;
  let projectRepository: jest.Mocked<Repository<Project>>;
  let customerRepository: jest.Mocked<Repository<Customer>>;

  const mockCustomerForProject = {
    id: 1,
    userId: 1,
    customerId: 1,
    projectId: 1,
    create_date: new Date(),
    create_by: 1,
    update_date: new Date(),
    update_by: 1,
    isenabled: true,
    users: {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      firstname: 'Test',
      lastname: 'User',
      phone: '1234567890',
    },
    project: {
      id: 1,
      name: 'Test Project',
    },
    customer: {
      id: 1,
      name: 'Test Customer',
      email: 'customer@example.com',
      telephone: '0987654321',
    },
  } as any;

  const mockProject = {
    id: 1,
    name: 'Test Project',
  } as any;

  const mockCustomer = {
    id: 1,
    name: 'Test Customer',
    email: 'customer@example.com',
    telephone: '0987654321',
  } as any;

  beforeEach(async () => {
    const mockCustomerForProjectRepository = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      remove: jest.fn(),
    };

    const mockProjectRepository = {
      findOneBy: jest.fn(),
    };

    const mockCustomerRepository = {
      findOneBy: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerForProjectService,
        {
          provide: getRepositoryToken(CustomerForProject),
          useValue: mockCustomerForProjectRepository,
        },
        {
          provide: getRepositoryToken(Project),
          useValue: mockProjectRepository,
        },
        {
          provide: getRepositoryToken(Customer),
          useValue: mockCustomerRepository,
        },
      ],
    }).compile();

    service = module.get<CustomerForProjectService>(CustomerForProjectService);
    customerForProjectRepository = module.get(getRepositoryToken(CustomerForProject));
    projectRepository = module.get(getRepositoryToken(Project));
    customerRepository = module.get(getRepositoryToken(Customer));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateCustomerForProjectDto = {
      user_id: 1,
      customer_id: 1,
      project_id: 1,
      create_by: 1,
      update_by: 1,
    };

    it('should create customer for project successfully', async () => {
      projectRepository.findOneBy.mockResolvedValue(mockProject);
      customerRepository.findOneBy.mockResolvedValue(mockCustomer);
      customerForProjectRepository.findOne.mockResolvedValue(null);
      customerForProjectRepository.save.mockResolvedValue(mockCustomerForProject);

      const result = await service.create(createDto);

      expect(projectRepository.findOneBy).toHaveBeenCalledWith({ id: createDto.project_id });
      expect(customerRepository.findOneBy).toHaveBeenCalledWith({ id: createDto.customer_id });
      expect(customerForProjectRepository.findOne).toHaveBeenCalledWith({
        where: {
          customerId: createDto.customer_id,
          projectId: createDto.project_id,
          userId: createDto.user_id,
          isenabled: true,
        },
      });
      expect(customerForProjectRepository.save).toHaveBeenCalled();
      expect(result).toEqual({
        code: '2',
        status: true,
        message: 'สร้างข้อมูลสำเร็จ',
        data: mockCustomerForProject,
      });
    });

    it('should return error when project_id is missing', async () => {
      const invalidDto = { ...createDto, project_id: undefined as any };

      const result = await service.create(invalidDto);

      expect(result).toEqual({
        code: '0',
        status: false,
        message: 'Project ID is required',
        data: null,
      });
    });

    it('should return error when customer_id is missing', async () => {
      const invalidDto = { ...createDto, customer_id: undefined as any };

      const result = await service.create(invalidDto);

      expect(result).toEqual({
        code: '0',
        status: false,
        message: 'Customer ID is required',
        data: null,
      });
    });

    it('should return error when user_id is missing', async () => {
      const invalidDto = { ...createDto, user_id: undefined as any };

      const result = await service.create(invalidDto);

      expect(result).toEqual({
        code: '0',
        status: false,
        message: 'User ID is required',
        data: null,
      });
    });

    it('should return error when project not found', async () => {
      projectRepository.findOneBy.mockResolvedValue(null);

      const result = await service.create(createDto);

      expect(result).toEqual({
        code: '0',
        status: false,
        message: 'ไม่พบข้อมูลโปรเจค',
        data: null,
      });
    });

    it('should return error when customer not found', async () => {
      projectRepository.findOneBy.mockResolvedValue(mockProject);
      customerRepository.findOneBy.mockResolvedValue(null);

      const result = await service.create(createDto);

      expect(result).toEqual({
        code: '0',
        status: false,
        message: 'ไม่พบข้อมูลลูกค้า',
        data: null,
      });
    });

    it('should return error when record already exists', async () => {
      projectRepository.findOneBy.mockResolvedValue(mockProject);
      customerRepository.findOneBy.mockResolvedValue(mockCustomer);
      customerForProjectRepository.findOne.mockResolvedValue(mockCustomerForProject);

      const result = await service.create(createDto);

      expect(result).toEqual({
        code: '0',
        status: false,
        message: 'ข้อมูลนี้มีอยู่ในระบบแล้ว',
        data: null,
      });
    });
  });

  describe('findAll', () => {
    it('should return all customer for project records', async () => {
      customerForProjectRepository.find.mockResolvedValue([mockCustomerForProject]);

      const result = await service.findAll();

      expect(customerForProjectRepository.find).toHaveBeenCalledWith({
        where: { isenabled: true },
        relations: ['users', 'project', 'customer'],
      });
      expect(result).toEqual({
        code: '2',
        status: true,
        message: 'Success',
        data: [mockCustomerForProject],
      });
    });
  });

  describe('findAllByUser', () => {
    it('should return customer for project records by user', async () => {
      customerForProjectRepository.find.mockResolvedValue([mockCustomerForProject]);

      const result = await service.findAllByUser(1);

      expect(customerForProjectRepository.find).toHaveBeenCalledWith({
        where: { userId: 1, isenabled: true },
        relations: ['customer', 'project'],
        order: { create_date: 'DESC' },
      });
      expect(result.code).toBe('2');
      expect(result.status).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return a single customer for project record', async () => {
      customerForProjectRepository.findOne.mockResolvedValue(mockCustomerForProject);

      const result = await service.findOne(1);

      expect(customerForProjectRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, isenabled: true },
        relations: ['users', 'project', 'customer'],
      });
      expect(result).toEqual({
        status: 1,
        message: 'Success',
        data: mockCustomerForProject,
      });
    });

    it('should return error when record not found', async () => {
      customerForProjectRepository.findOne.mockResolvedValue(null);

      const result = await service.findOne(999);

      expect(result).toEqual({
        status: 0,
        message: 'ไม่พบข้อมูล',
        data: null,
      });
    });
  });

  describe('update', () => {
    const updateDto: UpdateCustomerForProjectDto = {
      user_id: 2,
      project_id: 2,
      customer_id: 2,
    };

    it('should update customer for project record successfully', async () => {
      customerForProjectRepository.findOneBy.mockResolvedValue(mockCustomerForProject);
      projectRepository.findOneBy.mockResolvedValue(mockProject);
      customerRepository.findOneBy.mockResolvedValue(mockCustomer);
      customerForProjectRepository.save.mockResolvedValue(mockCustomerForProject);

      const result = await service.update(1, updateDto, 1);

      expect(customerForProjectRepository.findOneBy).toHaveBeenCalledWith({
        id: 1,
        isenabled: true,
      });
      expect(customerForProjectRepository.save).toHaveBeenCalled();
      expect(result).toEqual({
        status: 1,
        message: 'อัพเดทข้อมูลสำเร็จ',
        data: mockCustomerForProject,
      });
    });

    it('should return error when record not found', async () => {
      customerForProjectRepository.findOneBy.mockResolvedValue(null);

      const result = await service.update(999, updateDto, 1);

      expect(result).toEqual({
        status: 0,
        message: 'ไม่พบข้อมูล',
        data: null,
      });
    });

    it('should return error when project not found', async () => {
      customerForProjectRepository.findOneBy.mockResolvedValue(mockCustomerForProject);
      projectRepository.findOneBy.mockResolvedValue(null);

      const result = await service.update(1, updateDto, 1);

      expect(result).toEqual({
        status: 0,
        message: 'ไม่พบข้อมูลโปรเจค',
        data: null,
      });
    });

    it('should return error when customer not found', async () => {
      customerForProjectRepository.findOneBy.mockResolvedValue(mockCustomerForProject);
      projectRepository.findOneBy.mockResolvedValue(mockProject);
      customerRepository.findOneBy.mockResolvedValue(null);

      const result = await service.update(1, updateDto, 1);

      expect(result).toEqual({
        status: 0,
        message: 'ไม่พบข้อมูลลูกค้า',
        data: null,
      });
    });
  });

  describe('remove', () => {
    it('should soft delete customer for project record', async () => {
      const recordToDelete = { ...mockCustomerForProject };
      customerForProjectRepository.findOneBy.mockResolvedValue(recordToDelete);
      customerForProjectRepository.save.mockResolvedValue(recordToDelete);

      const result = await service.remove(1);

      expect(customerForProjectRepository.findOneBy).toHaveBeenCalledWith({
        id: 1,
        isenabled: true,
      });
      expect(customerForProjectRepository.save).toHaveBeenCalledWith({
        ...recordToDelete,
        isenabled: false,
      });
      expect(result).toEqual({
        status: 1,
        message: 'ลบข้อมูลสำเร็จ',
        data: null,
      });
    });

    it('should return error when record not found', async () => {
      customerForProjectRepository.findOneBy.mockResolvedValue(null);

      const result = await service.remove(999);

      expect(result).toEqual({
        status: 0,
        message: 'ไม่พบข้อมูล',
        data: null,
      });
    });
  });

  describe('changeUserAssignment', () => {
    it('should change user assignment successfully', async () => {
      const recordToUpdate = { ...mockCustomerForProject };
      customerForProjectRepository.findOneBy.mockResolvedValue(recordToUpdate);
      customerForProjectRepository.save.mockResolvedValue(recordToUpdate);

      const result = await service.changeUserAssignment(1, 2, 1);

      expect(customerForProjectRepository.findOneBy).toHaveBeenCalledWith({
        id: 1,
        isenabled: true,
      });
      expect(customerForProjectRepository.save).toHaveBeenCalled();
      expect(result).toEqual({
        status: 1,
        message: 'เปลี่ยนผู้รับผิดชอบสำเร็จ',
        data: recordToUpdate,
      });
    });

    it('should return error when record not found', async () => {
      customerForProjectRepository.findOneBy.mockResolvedValue(null);

      const result = await service.changeUserAssignment(999, 2, 1);

      expect(result).toEqual({
        status: 0,
        message: 'ไม่พบข้อมูล',
        data: null,
      });
    });
  });

  describe('getCustomersByProject', () => {
    it('should return customers by project', async () => {
      customerForProjectRepository.find.mockResolvedValue([mockCustomerForProject]);

      const result = await service.getCustomersByProject(1);

      expect(customerForProjectRepository.find).toHaveBeenCalledWith({
        where: { projectId: 1, isenabled: true },
        relations: ['customer'],
      });
      expect(result.status).toBe(1);
      expect(result.message).toBe('Success');
      expect(result.data).toHaveLength(1);
    });

    it('should return error when no customers found', async () => {
      customerForProjectRepository.find.mockResolvedValue([]);

      const result = await service.getCustomersByProject(999);

      expect(result).toEqual({
        status: 0,
        message: 'ไม่พบข้อมูลลูกค้าในโปรเจคนี้',
        data: null,
      });
    });
  });

  describe('getProjectsByCustomer', () => {
    it('should return projects by customer', async () => {
      customerForProjectRepository.find.mockResolvedValue([mockCustomerForProject]);

      const result = await service.getProjectsByCustomer(1);

      expect(customerForProjectRepository.find).toHaveBeenCalledWith({
        where: { customerId: 1, isenabled: true },
        relations: ['project'],
      });
      expect(result.status).toBe(1);
      expect(result.message).toBe('Success');
      expect(result.data).toHaveLength(1);
    });

    it('should return error when no projects found', async () => {
      customerForProjectRepository.find.mockResolvedValue([]);

      const result = await service.getProjectsByCustomer(999);

      expect(result).toEqual({
        status: 0,
        message: 'ไม่พบข้อมูลโปรเจคของลูกค้านี้',
        data: null,
      });
    });
  });

  describe('getUsersByCustomer', () => {
    it('should return users by customer', async () => {
      customerForProjectRepository.find.mockResolvedValue([mockCustomerForProject]);

      const result = await service.getUsersByCustomer(1);

      expect(customerForProjectRepository.find).toHaveBeenCalledWith({
        where: { customerId: 1, isenabled: true },
        relations: ['users'],
      });
      expect(result.code).toBe('2');
      expect(result.status).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('should return error when no users found', async () => {
      customerForProjectRepository.find.mockResolvedValue([]);

      const result = await service.getUsersByCustomer(999);

      expect(result).toEqual({
        status: 0,
        message: 'ไม่พบข้อมูล users ของลูกค้านี้',
        data: null,
      });
    });
  });

  describe('getCustomerProjectsByUser', () => {
    it('should return customer projects by user', async () => {
      customerForProjectRepository.find.mockResolvedValue([mockCustomerForProject]);

      const result = await service.getCustomerProjectsByUser(1);

      expect(customerForProjectRepository.find).toHaveBeenCalledWith({
        where: { userId: 1, isenabled: true },
        relations: ['customer', 'project'],
      });
      expect(result.code).toBe('2');
      expect(result.status).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('should return error when no data found', async () => {
      customerForProjectRepository.find.mockResolvedValue([]);

      const result = await service.getCustomerProjectsByUser(999);

      expect(result).toEqual({
        code: '0',
        status: false,
        message: 'ไม่พบข้อมูลลูกค้าและโปรเจคของ user นี้',
        data: null,
      });
    });
  });
});