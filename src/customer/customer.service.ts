// customer/customer.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
  ) { }

  async create(createCustomerDto: CreateCustomerDto, userId: number) {
    const customer = new Customer();
    customer.name = createCustomerDto.name;
    customer.address = createCustomerDto.address;
    customer.telephone = createCustomerDto.telephone;
    customer.email = createCustomerDto.email;
    customer.create_by = createCustomerDto.create_by;
    customer.update_by = createCustomerDto.update_by;
    customer.isenabled = true;

    await this.customerRepository.save(customer);

    return {
      code: 1,
      status: true,
      message: 'เพิ่มข้อมูลลูกค้าสำเร็จ',
      data: customer
    };
  }

  async getCustomer() {
    try {
      const result = await this.customerRepository
        .createQueryBuilder('c')
        .select([
          'c.name',
          'c.address',
          'c.email',
          'c.telephone',
          'c.status'
        ])
        .getMany();

      return {
        code: 0,
        status: true,
        message: 'get customer data successfully',
        data: result
      }
    } catch (error) {
      console.log('Error get customer:', error)

      return {
        code: 1,
        status: false,
        message: error
      }
    }
  }

  async findAll() {
    const customers = await this.customerRepository.find({
      where: { isenabled: true },
      order: { name: 'ASC' }
    });

    return {
      code: 1,
      status: true,
      message: 'Success',
      data: customers
    };
  }

  async findOne(id: number) {
    // เพิ่มการตรวจสอบ input
    console.log('CustomerService.findOne received:', id, typeof id);

    // ตรวจสอบว่า id ถูกต้องหรือไม่
    if (id === null || id === undefined || isNaN(id) || !Number.isInteger(Number(id))) {
      return {
        code: 0,
        status: false,
        message: `Invalid customer ID: ${id}`,
        data: null
      };
    }

    const customer = await this.customerRepository.findOne({
      where: { id: Number(id), isenabled: true }  // แปลงเป็น Number ให้แน่ใจ
    });

    if (!customer) {
      return {
        code: 0,
        status: false,
        message: 'ไม่พบข้อมูลลูกค้า',
        data: null
      };
    }

    return {
      code: 1,
      status: true,
      message: 'Success',
      data: customer
    };
  }

  async update(id: number, updateCustomerDto: UpdateCustomerDto, userId: number) {
    const customer = await this.customerRepository.findOneBy({ id });

    if (!customer || !customer.isenabled) {
      return {
        code: 0,
        status: false,
        message: 'ไม่พบข้อมูลลูกค้า',
        data: null
      };
    }

    // อัพเดตข้อมูล
    if (updateCustomerDto.name) customer.name = updateCustomerDto.name;
    if (updateCustomerDto.address) customer.address = updateCustomerDto.address;
    if (updateCustomerDto.telephone) customer.telephone = updateCustomerDto.telephone;
    if (updateCustomerDto.email) customer.email = updateCustomerDto.email;

    customer.update_date = new Date();
    customer.update_by = userId;

    await this.customerRepository.save(customer);

    return {
      code: 1,
      status: true,
      message: 'อัพเดตข้อมูลลูกค้าสำเร็จ',
      data: customer
    };
  }

  async remove(id: number) {
    const customer = await this.customerRepository.findOneBy({ id });

    if (!customer || !customer.isenabled) {
      return {
        code: 0,
        status: false,
        message: 'ไม่พบข้อมูลลูกค้า',
        data: null
      };
    }

    // Soft delete
    customer.isenabled = false;
    await this.customerRepository.save(customer);

    return {
      code: 1,
      status: true,
      message: 'ลบข้อมูลลูกค้าสำเร็จ',
      data: null
    };
  }

  async findCustomersByUserId(userId: number) {
    const customers = await this.customerRepository
      .createQueryBuilder('c')
      .innerJoin('customer_for_project', 'cfp', 'cfp.customer_id = c.id')
      .where('cfp.user_id = :userId', { userId })
      .andWhere('cfp.isenabled = :isEnabled', { isEnabled: true })
      .andWhere('c.isenabled = :isEnabled', { isEnabled: true })
      .select([
        'c.id',
        'c.name',
        'c.address',
        'c.telephone',
        'c.email'
      ])
      .distinct(true)
      .orderBy('c.name', 'ASC')
      .getRawMany();

    return {
      code: 1,
      status: true,
      message: 'Success',
      data: customers
    };
  }
}
