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
      status: true,
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
});