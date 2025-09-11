import { Test, TestingModule } from '@nestjs/testing';
import { CustomerForProjectController } from './customer_for_project.controller';
import { CustomerForProjectService } from './customer_for_project.service';
import { CreateCustomerForProjectDto } from './dto/create-customer_for_project.dto';
import { UpdateCustomerForProjectDto } from './dto/update-customer_for_project.dto';

describe('CustomerForProjectController', () => {
  let controller: CustomerForProjectController;
  let service: Partial<CustomerForProjectService>;

  const mockRequest = {
    user: {
      id: 1,
      sub: 1,
      userId: 1,
      username: 'testuser',
    },
  };

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      changeUserAssignment: jest.fn(),
      getCustomersByProject: jest.fn(),
      getProjectsByCustomer: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerForProjectController],
      providers: [
        {
          provide: CustomerForProjectService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<CustomerForProjectController>(CustomerForProjectController);
    service = module.get<CustomerForProjectService>(CustomerForProjectService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateCustomerForProjectDto = {
      user_id: 1,
      customer_id: 1,
      project_id: 1,
      create_by: 1,
      update_by: 1,
    };

    const mockCreateResponse = {
      code: '2',
      status: true,
      message: 'สร้างข้อมูลสำเร็จ',
      data: {
        id: 1,
        userId: 1,
        customerId: 1,
        projectId: 1,
      } as any,
    };

    it('should create customer for project successfully', async () => {
      service.create = jest.fn().mockResolvedValue(mockCreateResponse);

      const result = await controller.create(createDto, mockRequest);

      expect(service.create).toHaveBeenCalledWith({
        ...createDto,
        create_by: 1,
        update_by: 1,
      });
      expect(result).toEqual(mockCreateResponse);
    });

    it('should extract user id from request', async () => {
      service.create = jest.fn().mockResolvedValue(mockCreateResponse);

      await controller.create(createDto, mockRequest);

      expect(service.create).toHaveBeenCalledWith(
        expect.objectContaining({
          create_by: 1,
          update_by: 1,
        }),
      );
    });

    it('should handle different user id properties', async () => {
      const requestWithSub = { user: { sub: 2 } };
      service.create = jest.fn().mockResolvedValue(mockCreateResponse);

      await controller.create(createDto, requestWithSub as any);

      expect(service.create).toHaveBeenCalledWith(
        expect.objectContaining({
          create_by: 2,
          update_by: 2,
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return all records', async () => {
      const mockResponse = {
        code: '2',
        status: true,
        message: 'Success',
        data: [] as any,
      };
      
      service.findAll = jest.fn().mockResolvedValue(mockResponse);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getCustomersByProject', () => {
    it('should return customers by project', async () => {
      const mockResponse = {
        status: 1,
        message: 'Success',
        data: [{
          id: 1,
          customer: {
            id: 1,
            name: 'Test Customer',
          },
        }],
      };
      
      service.getCustomersByProject = jest.fn().mockResolvedValue(mockResponse);

      const result = await controller.getCustomersByProject('1');

      expect(service.getCustomersByProject).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockResponse);
    });

    it('should convert string to number', async () => {
      const mockResponse = { status: 1, message: 'Success', data: [] };
      service.getCustomersByProject = jest.fn().mockResolvedValue(mockResponse);

      await controller.getCustomersByProject('123');

      expect(service.getCustomersByProject).toHaveBeenCalledWith(123);
    });
  });

  describe('getProjectsByCustomer', () => {
    it('should return projects by customer', async () => {
      const mockResponse = {
        status: 1,
        message: 'Success',
        data: [{
          id: 1,
          project: {
            id: 1,
            name: 'Test Project',
          },
        }],
      };
      
      service.getProjectsByCustomer = jest.fn().mockResolvedValue(mockResponse);

      const result = await controller.getProjectsByCustomer('1');

      expect(service.getProjectsByCustomer).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('findOne', () => {
    it('should return single record', async () => {
      const mockResponse = {
        status: 1,
        message: 'Success',
        data: { id: 1 } as any,
      };
      
      service.findOne = jest.fn().mockResolvedValue(mockResponse);

      const result = await controller.findOne('1');

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockResponse);
    });

    it('should handle not found', async () => {
      const mockResponse = {
        status: 0,
        message: 'ไม่พบข้อมูล',
        data: null,
      };
      
      service.findOne = jest.fn().mockResolvedValue(mockResponse);

      const result = await controller.findOne('999');

      expect(result).toEqual(mockResponse);
    });
  });

  describe('update', () => {
    const updateDto: UpdateCustomerForProjectDto = {
      user_id: 2,
    };

    it('should update record successfully', async () => {
      const mockResponse = {
        status: 1,
        message: 'อัพเดทข้อมูลสำเร็จ',
        data: { id: 1 } as any,
      };
      
      service.update = jest.fn().mockResolvedValue(mockResponse);

      const result = await controller.update('1', updateDto, mockRequest);

      expect(service.update).toHaveBeenCalledWith(1, updateDto, 1);
      expect(result).toEqual(mockResponse);
    });

    it('should set create_by and update_by', async () => {
      const mockResponse = { status: 1, message: 'Success', data: {} as any };
      service.update = jest.fn().mockResolvedValue(mockResponse);

      await controller.update('1', updateDto, mockRequest);

      expect(service.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          create_by: 1,
          update_by: 1,
        }),
        1,
      );
    });
  });

  describe('remove', () => {
    it('should remove record successfully', async () => {
      const mockResponse = {
        status: 1,
        message: 'ลบข้อมูลสำเร็จ',
        data: null,
      };
      
      service.remove = jest.fn().mockResolvedValue(mockResponse);

      const result = await controller.remove('1');

      expect(service.remove).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('changeUser', () => {
    it('should change user assignment', async () => {
      const mockResponse = {
        status: 1,
        message: 'เปลี่ยนผู้รับผิดชอบสำเร็จ',
        data: { id: 1 } as any,
      };
      
      service.changeUserAssignment = jest.fn().mockResolvedValue(mockResponse);

      const result = await controller.changeUser('1', '2', mockRequest);

      expect(service.changeUserAssignment).toHaveBeenCalledWith(1, 2, 1);
      expect(result).toEqual(mockResponse);
    });

    it('should convert string parameters to numbers', async () => {
      const mockResponse = { status: 1, message: 'Success', data: {} as any };
      service.changeUserAssignment = jest.fn().mockResolvedValue(mockResponse);

      await controller.changeUser('123', '456', mockRequest);

      expect(service.changeUserAssignment).toHaveBeenCalledWith(123, 456, 1);
    });
  });

  describe('error handling', () => {
    it('should handle service errors in create', async () => {
      const createDto: CreateCustomerForProjectDto = {
        user_id: 1,
        customer_id: 1,
        project_id: 1,
        create_by: 1,
        update_by: 1,
      };
      const errorResponse = {
        code: '0',
        status: false,
        message: 'Project ID is required',
        data: null,
      };
      
      service.create = jest.fn().mockResolvedValue(errorResponse);

      const result = await controller.create(createDto, mockRequest);

      expect(result).toEqual(errorResponse);
    });

    it('should handle service errors in update', async () => {
      const updateDto: UpdateCustomerForProjectDto = { user_id: 2 };
      const errorResponse = {
        status: 0,
        message: 'ไม่พบข้อมูล',
        data: null,
      };
      
      service.update = jest.fn().mockResolvedValue(errorResponse);

      const result = await controller.update('999', updateDto, mockRequest);

      expect(result).toEqual(errorResponse);
    });
  });

  describe('edge cases', () => {
    it('should handle undefined user in request', async () => {
      const createDto: CreateCustomerForProjectDto = {
        user_id: 1,
        customer_id: 1,
        project_id: 1,
        create_by: 1,
        update_by: 1,
      };
      const mockResponse = { code: '2', status: true, message: 'Success', data: {} as any };
      const requestWithoutUser = { user: {} } as any;
      
      service.create = jest.fn().mockResolvedValue(mockResponse);

      await controller.create(createDto, requestWithoutUser);

      expect(service.create).toHaveBeenCalledWith(
        expect.objectContaining({
          create_by: undefined,
          update_by: undefined,
        }),
      );
    });

    it('should handle empty string parameters', async () => {
      const mockResponse = { status: 0, message: 'ไม่พบข้อมูล', data: null };
      service.findOne = jest.fn().mockResolvedValue(mockResponse);

      const result = await controller.findOne('');

      expect(service.findOne).toHaveBeenCalledWith(0);
    });

    it('should handle non-numeric string parameters', async () => {
      const mockResponse = { status: 0, message: 'ไม่พบข้อมูล', data: null };
      service.findOne = jest.fn().mockResolvedValue(mockResponse);

      await controller.findOne('abc');

      expect(service.findOne).toHaveBeenCalledWith(NaN);
    });
  });
});