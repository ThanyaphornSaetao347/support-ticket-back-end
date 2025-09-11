import { Test, TestingModule } from '@nestjs/testing';
import { CustomerService } from './customer.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

describe('CustomerService', () => {
  let service: CustomerService;
  let customerRepository: jest.Mocked<Repository<Customer>>;

  const mockCustomer = {
    id: 1,
    name: 'Test Customer',
    address: '123 Test Street',
    telephone: '0123456789',
    email: 'test@example.com',
    create_date: new Date(),
    craete_by: 1,
    update_date: new Date(),
    update_by: 1,
    isenabled: true,
    projects: [],
  } as any;

  beforeEach(async () => {
    const mockCustomerRepository = {
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      create: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        {
          provide: getRepositoryToken(Customer),
          useValue: mockCustomerRepository,
        },
      ],
    }).compile();

    service = module.get<CustomerService>(CustomerService);
    customerRepository = module.get(getRepositoryToken(Customer));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateCustomerDto = {
      name: 'New Customer',
      address: '456 New Street',
      telephone: '0987654321',
      email: 'new@example.com',
      create_by: 1,
      update_by: 1,
    };

    it('should create a customer successfully', async () => {
      // ใช้ mockResolvedValue แบบง่าย
      const savedCustomer = {
        id: 1,
        name: createDto.name,
        address: createDto.address,
        telephone: createDto.telephone,
        email: createDto.email,
        craete_by: createDto.create_by,
        update_by: createDto.update_by,
        isenabled: true,
        create_date: new Date(),
        update_date: new Date(),
        projects: [],
      } as any;

      customerRepository.save.mockResolvedValue(savedCustomer);

      const result = await service.create(createDto, 1);

      expect(customerRepository.save).toHaveBeenCalled();
      expect(result.code).toBe(1);
      expect(result.status).toBe(true);
      expect(result.message).toBe('เพิ่มข้อมูลลูกค้าสำเร็จ');
      // ตรวจสอบเฉพาะ properties ที่สำคัญ
      expect(result.data.name).toBe(createDto.name);
      expect(result.data.address).toBe(createDto.address);
      expect(result.data.telephone).toBe(createDto.telephone);
      expect(result.data.email).toBe(createDto.email);
    });

    it('should set correct properties on customer entity', async () => {
      const savedCustomer = { ...mockCustomer, ...createDto };
      customerRepository.save.mockResolvedValue(savedCustomer);

      await service.create(createDto, 1);

      const saveCall = customerRepository.save.mock.calls[0][0];
      expect(saveCall.name).toBe(createDto.name);
      expect(saveCall.address).toBe(createDto.address);
      expect(saveCall.telephone).toBe(createDto.telephone);
      expect(saveCall.email).toBe(createDto.email);
      expect(saveCall.create_by).toBe(createDto.create_by);
      expect(saveCall.update_by).toBe(createDto.update_by);
      expect(saveCall.isenabled).toBe(true);
    });
  });

  describe('findAll', () => {
    it('should return all enabled customers', async () => {
      const customers = [mockCustomer];
      customerRepository.find.mockResolvedValue(customers);

      const result = await service.findAll();

      expect(customerRepository.find).toHaveBeenCalledWith({
        where: { isenabled: true },
        order: { name: 'ASC' },
      });
      expect(result).toEqual({
        code: 1,
        status: true,
        message: 'Success',
        data: customers,
      });
    });

    it('should return empty array when no customers found', async () => {
      customerRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual({
        code: 1,
        status: true,
        message: 'Success',
        data: [],
      });
    });
  });

  describe('findOne', () => {
    it('should return a customer when found', async () => {
      customerRepository.findOne.mockResolvedValue(mockCustomer);

      const result = await service.findOne(1);

      expect(customerRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, isenabled: true },
      });
      expect(result).toEqual({
        code: 1,
        status: true,
        message: 'Success',
        data: mockCustomer,
      });
    });

    it('should return error when customer not found', async () => {
      customerRepository.findOne.mockResolvedValue(null);

      const result = await service.findOne(999);

      expect(result).toEqual({
        code: 0,
        status: false,
        message: 'ไม่พบข้อมูลลูกค้า',
        data: null,
      });
    });
  });

  describe('update', () => {
    const updateDto: UpdateCustomerDto = {
      name: 'Updated Customer',
      address: 'Updated Address',
    };

    it('should update customer successfully', async () => {
      const existingCustomer = { ...mockCustomer };
      customerRepository.findOneBy.mockResolvedValue(existingCustomer);

      // Mock the updated customer that will be saved
      const updatedCustomer = {
        ...existingCustomer,
        ...updateDto,
        update_by: 2,
        update_date: expect.any(Date)
      };
      customerRepository.save.mockResolvedValue(updatedCustomer);

      const result = await service.update(1, updateDto, 2);

      expect(customerRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(customerRepository.save).toHaveBeenCalled();
      expect(result.code).toBe(1);
      expect(result.status).toBe(true);
      expect(result.message).toBe('อัพเดตข้อมูลลูกค้าสำเร็จ');
      expect(result.data).toBeDefined();
    });

    it('should return error when customer not found', async () => {
      customerRepository.findOneBy.mockResolvedValue(null);

      const result = await service.update(999, updateDto, 2);

      expect(result).toEqual({
        code: 0,
        status: false,
        message: 'ไม่พบข้อมูลลูกค้า',
        data: null,
      });
    });

    it('should return error when customer is disabled', async () => {
      const disabledCustomer = { ...mockCustomer, isenabled: false };
      customerRepository.findOneBy.mockResolvedValue(disabledCustomer);

      const result = await service.update(1, updateDto, 2);

      expect(result).toEqual({
        code: 0,
        status: false,
        message: 'ไม่พบข้อมูลลูกค้า',
        data: null,
      });
    });

    it('should update only provided fields', async () => {
      const existingCustomer = { ...mockCustomer };
      const partialUpdateDto: UpdateCustomerDto = { name: 'Only Name Updated' };

      customerRepository.findOneBy.mockResolvedValue(existingCustomer);
      customerRepository.save.mockResolvedValue(existingCustomer);

      await service.update(1, partialUpdateDto, 2);

      const saveCall = customerRepository.save.mock.calls[0][0];
      expect(saveCall.name).toBe('Only Name Updated');
      expect(saveCall.address).toBe(mockCustomer.address); // unchanged
      expect(saveCall.update_by).toBe(2);
      expect(saveCall.update_date).toBeInstanceOf(Date);
    });
  });

  describe('remove', () => {
    it('should soft delete customer successfully', async () => {
      const customerToDelete = { ...mockCustomer };
      customerRepository.findOneBy.mockResolvedValue(customerToDelete);
      customerRepository.save.mockResolvedValue({ ...customerToDelete, isenabled: false });

      const result = await service.remove(1);

      expect(customerRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(customerRepository.save).toHaveBeenCalledWith({
        ...customerToDelete,
        isenabled: false,
      });
      expect(result).toEqual({
        code: 1,
        status: true,
        message: 'ลบข้อมูลลูกค้าสำเร็จ',
        data: null,
      });
    });

    it('should return error when customer not found', async () => {
      customerRepository.findOneBy.mockResolvedValue(null);

      const result = await service.remove(999);

      expect(result).toEqual({
        code: 0,
        status: false,
        message: 'ไม่พบข้อมูลลูกค้า',
        data: null,
      });
    });

    it('should return error when customer is already disabled', async () => {
      const disabledCustomer = { ...mockCustomer, isenabled: false };
      customerRepository.findOneBy.mockResolvedValue(disabledCustomer);

      const result = await service.remove(1);

      expect(result).toEqual({
        code: 0,
        status: false,
        message: 'ไม่พบข้อมูลลูกค้า',
        data: null,
      });
    });
  });

  describe('findCustomersByUserId', () => {
    const mockQueryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
    } as any; // Use 'as any' to bypass strict typing for test mocks

    beforeEach(() => {
      customerRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    });

    it('should return customers for specific user', async () => {
      const mockCustomers = [
        {
          c_id: 1,
          c_name: 'Customer 1',
          c_address: 'Address 1',
          c_telephone: '123456789',
          c_email: 'customer1@example.com',
        },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValue(mockCustomers);

      const result = await service.findCustomersByUserId(1);

      expect(customerRepository.createQueryBuilder).toHaveBeenCalledWith('c');
      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith(
        'customer_for_project',
        'cfp',
        'cfp.customer_id = c.id',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('cfp.user_id = :userId', { userId: 1 });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('cfp.isenabled = :isEnabled', { isEnabled: true });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('c.isenabled = :isEnabled', { isEnabled: true });
      expect(mockQueryBuilder.select).toHaveBeenCalledWith([
        'c.id',
        'c.name',
        'c.address',
        'c.telephone',
        'c.email',
      ]);
      expect(mockQueryBuilder.distinct).toHaveBeenCalledWith(true);
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('c.name', 'ASC');

      expect(result).toEqual({
        code: 1,
        status: true,
        message: 'Success',
        data: mockCustomers,
      });
    });

    it('should return empty array when no customers found for user', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      const result = await service.findCustomersByUserId(999);

      expect(result).toEqual({
        code: 1,
        status: true,
        message: 'Success',
        data: [],
      });
    });

    it('should handle query builder errors', async () => {
      mockQueryBuilder.getRawMany.mockRejectedValue(new Error('Database error'));

      await expect(service.findCustomersByUserId(1)).rejects.toThrow('Database error');
    });
  });

  describe('error handling', () => {
    it('should handle database errors in create', async () => {
      const createDto: CreateCustomerDto = {
        name: 'Test Customer',
        address: 'Test Address',
        telephone: '123456789',
        email: 'test@example.com',
        create_by: 1,
        update_by: 1,
      };

      customerRepository.save.mockRejectedValue(new Error('Database connection error'));

      await expect(service.create(createDto, 1)).rejects.toThrow('Database connection error');
    });

    it('should handle database errors in findAll', async () => {
      customerRepository.find.mockRejectedValue(new Error('Database error'));

      await expect(service.findAll()).rejects.toThrow('Database error');
    });
  });
});