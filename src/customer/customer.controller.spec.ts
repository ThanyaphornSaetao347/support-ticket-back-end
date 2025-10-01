import { Test, TestingModule } from '@nestjs/testing';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

describe('CustomerController', () => {
  let controller: CustomerController;
  let service: Partial<CustomerService>;

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
      findCustomersByUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerController],
      providers: [
        {
          provide: CustomerService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<CustomerController>(CustomerController);
    service = module.get<CustomerService>(CustomerService);

    jest.clearAllMocks();

    // Mock console.log to avoid output during tests
    jest.spyOn(console, 'log').mockImplementation(() => { });
  });

  afterEach(() => {
    // Restore console.log
    (console.log as jest.Mock).mockRestore();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateCustomerDto = {
      name: 'Test Customer',
      address: '123 Test Street',
      telephone: '0123456789',
      email: 'test@example.com',
      create_by: 1,
      update_by: 1,
      status: true,
    };

    const mockCreateResponse = {
      code: 1,
      status: true,
      message: 'เพิ่มข้อมูลลูกค้าสำเร็จ',
      data: {
        id: 1,
        ...createDto,
        create_date: new Date(),
        update_date: new Date(),
        isenabled: true,
      } as any,
    };

    it('should create customer successfully', async () => {
      service.create = jest.fn().mockResolvedValue(mockCreateResponse);

      const result = await controller.create(createDto, mockRequest);

      expect(service.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createDto,
          create_by: 1,
          update_by: 1,
        }),
        1,
      );
      expect(result).toEqual(mockCreateResponse);
    });

    it('should extract user id from request and set create_by and update_by', async () => {
      service.create = jest.fn().mockResolvedValue(mockCreateResponse);

      await controller.create(createDto, mockRequest);

      expect(service.create).toHaveBeenCalledWith(
        expect.objectContaining({
          create_by: 1,
          update_by: 1,
        }),
        1,
      );
    });

    it('should handle request with sub property', async () => {
      const requestWithSub = {
        user: { sub: 2, username: 'testuser2' },
      };
      service.create = jest.fn().mockResolvedValue(mockCreateResponse);

      await controller.create(createDto, requestWithSub as any);

      expect(service.create).toHaveBeenCalledTimes(1);

      // ตรวจสอบ arguments ที่ส่งไป
      const calls = (service.create as jest.Mock).mock.calls[0];
      expect(calls[0].create_by).toBe(2);
      expect(calls[0].update_by).toBe(2);
      expect(calls[1]).toBe(2);
    });

    // สำหรับ update test - ต้องมี updateDto และ mockUpdateResponse ก่อน
    describe('update', () => {
      const updateDto: UpdateCustomerDto = {
        name: 'Updated Customer',
        address: 'Updated Address',
      };

      const mockUpdateResponse = {
        code: 1,
        status: true,
        message: 'อัพเดตข้อมูลลูกค้าสำเร็จ',
        data: {
          id: 1,
          ...updateDto,
          telephone: '123456789',
          email: 'test@example.com',
          update_date: new Date(),
        } as any,
      };

      // ... other update tests ...

      it('should handle different user id properties in request', async () => {
        const requestWithSub = {
          user: { sub: 7, username: 'testuser7' },
        };
        service.update = jest.fn().mockResolvedValue(mockUpdateResponse);

        await controller.update('1', updateDto, requestWithSub as any);

        expect(service.update).toHaveBeenCalledTimes(1);

        // ตรวจสอบ arguments ที่ส่งไป
        const calls = (service.update as jest.Mock).mock.calls[0];
        expect(calls[0]).toBe(1); // id
        expect(calls[1].create_by).toBe(7);
        expect(calls[1].update_by).toBe(7);
        expect(calls[2]).toBe(7); // userId
      });
    });

    describe('update', () => {
      const updateDto: UpdateCustomerDto = {
        name: 'Updated Customer',
        address: 'Updated Address',
      };

      const mockUpdateResponse = {
        code: 1,
        status: true,
        message: 'อัพเดตข้อมูลลูกค้าสำเร็จ',
        data: {
          id: 1,
          ...updateDto,
          telephone: '123456789',
          email: 'test@example.com',
          update_date: new Date(),
        } as any,
      };

      it('should update customer successfully', async () => {
        service.update = jest.fn().mockResolvedValue(mockUpdateResponse);

        const result = await controller.update('1', updateDto, mockRequest);

        expect(service.update).toHaveBeenCalledWith(1, updateDto, 1);
        expect(result).toEqual(mockUpdateResponse);
      });

      it('should set create_by and update_by from request user', async () => {
        service.update = jest.fn().mockResolvedValue(mockUpdateResponse);

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

      it('should convert string id to number', async () => {
        service.update = jest.fn().mockResolvedValue(mockUpdateResponse);

        await controller.update('456', updateDto, mockRequest);

        expect(service.update).toHaveBeenCalledWith(456, expect.any(Object), 1);
      });

      it('should handle different user id properties in request', async () => {
        const requestWithSub = {
          user: { sub: 7, username: 'testuser7' },
        };
        service.update = jest.fn().mockResolvedValue(mockUpdateResponse);

        await controller.update('1', updateDto, requestWithSub as any);

        expect(service.update).toHaveBeenCalledWith(
          1,
          expect.objectContaining({
            create_by: 7,
            update_by: 7,
          }),
          7,
        );
      });

      it('should log user information', async () => {
        service.update = jest.fn().mockResolvedValue(mockUpdateResponse);

        await controller.update('1', updateDto, mockRequest);

        expect(console.log).toHaveBeenCalledWith('User in request:', mockRequest.user);
      });

      it('should return error when customer not found', async () => {
        const errorResponse = {
          code: 0,
          status: false,
          message: 'ไม่พบข้อมูลลูกค้า',
          data: null,
        };

        service.update = jest.fn().mockResolvedValue(errorResponse);

        const result = await controller.update('999', updateDto, mockRequest);

        expect(result).toEqual(errorResponse);
      });
    });

    describe('remove', () => {
      it('should remove customer successfully', async () => {
        const mockResponse = {
          code: 1,
          status: true,
          message: 'ลบข้อมูลลูกค้าสำเร็จ',
          data: null,
        };

        service.remove = jest.fn().mockResolvedValue(mockResponse);

        const result = await controller.remove('1');

        expect(service.remove).toHaveBeenCalledWith(1);
        expect(result).toEqual(mockResponse);
      });

      it('should convert string id to number', async () => {
        const mockResponse = { code: 1, status: true, message: 'ลบข้อมูลลูกค้าสำเร็จ', data: null };
        service.remove = jest.fn().mockResolvedValue(mockResponse);

        await controller.remove('789');

        expect(service.remove).toHaveBeenCalledWith(789);
      });

      it('should return error when customer not found', async () => {
        const errorResponse = {
          code: 0,
          status: false,
          message: 'ไม่พบข้อมูลลูกค้า',
          data: null,
        };

        service.remove = jest.fn().mockResolvedValue(errorResponse);

        const result = await controller.remove('999');

        expect(result).toEqual(errorResponse);
      });
    });

    describe('error handling', () => {
      it('should handle service errors in create', async () => {
        const createDto: CreateCustomerDto = {
          name: 'Test Customer',
          address: 'Test Address',
          telephone: '123456789',
          email: 'test@example.com',
          create_by: 1,
          update_by: 1,
          status: true
        };

        service.create = jest.fn().mockRejectedValue(new Error('Database error'));

        await expect(controller.create(createDto, mockRequest)).rejects.toThrow('Database error');
      });

      it('should handle service errors in update', async () => {
        const updateDto: UpdateCustomerDto = { name: 'Updated Name' };

        service.update = jest.fn().mockRejectedValue(new Error('Update failed'));

        await expect(controller.update('1', updateDto, mockRequest)).rejects.toThrow('Update failed');
      });

      it('should handle service errors in remove', async () => {
        service.remove = jest.fn().mockRejectedValue(new Error('Remove failed'));

        await expect(controller.remove('1')).rejects.toThrow('Remove failed');
      });
    });
  });
})