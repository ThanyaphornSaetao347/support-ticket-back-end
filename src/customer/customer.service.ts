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
<<<<<<< HEAD
          'c.id',
          'c.name',
          'c.address',
          'c.email',
          'c.telephone',
          'c.status'
        ])
        .where('isenabled = true')
=======
          'c.name',
          'c.address',
          'c.email',
<<<<<<< HEAD
          'c.telephone',
          'c.status'
=======
          'c.telephone'
>>>>>>> fef258e11fb85526f63cfa733c58125e62453040
        ])
>>>>>>> cea3524b1f3c03397e21b1d2703b94b86d58787a
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
    console.log('Start update for customer id:', id);

    // หา customer ก่อน
    const customer = await this.customerRepository.findOneBy({ id });
    if (!customer || !customer.isenabled) {
      console.log('Customer not found or disabled');
      return {
        code: 0,
        status: false,
        message: 'ไม่พบข้อมูลลูกค้า',
        data: null
      };
    }

<<<<<<< HEAD
    // อัพเดต fields ทีละตัว
    const fieldsToUpdate: Partial<Customer> = {};
    if (updateCustomerDto.name) fieldsToUpdate.name = updateCustomerDto.name;
    if (updateCustomerDto.address) fieldsToUpdate.address = updateCustomerDto.address;
    if (updateCustomerDto.telephone) fieldsToUpdate.telephone = updateCustomerDto.telephone;
    if (updateCustomerDto.email) fieldsToUpdate.email = updateCustomerDto.email;
    if (updateCustomerDto.status != undefined) fieldsToUpdate.status = updateCustomerDto.status;
=======
    // อัพเดตข้อมูล
    if (updateCustomerDto.name) customer.name = updateCustomerDto.name;
    if (updateCustomerDto.address) customer.address = updateCustomerDto.address;
    if (updateCustomerDto.telephone) customer.telephone = updateCustomerDto.telephone;
    if (updateCustomerDto.email) customer.email = updateCustomerDto.email;

    customer.update_date = new Date();
    customer.update_by = userId;
>>>>>>> cea3524b1f3c03397e21b1d2703b94b86d58787a

    // set update info
    fieldsToUpdate.update_by = userId;
    fieldsToUpdate.update_date = new Date();

    console.log('Fields to update:', fieldsToUpdate);

    // ใช้ save แยก fields แทน merge ทั้ง object เพื่อลดปัญหา
    try {
      const updatedCustomer = await this.customerRepository.save({
        id: customer.id,
        ...fieldsToUpdate
      });
      console.log('Customer updated successfully');

      return {
        code: 1,
        status: true,
        message: 'อัพเดตข้อมูลลูกค้าสำเร็จ',
        data: updatedCustomer
      };
    } catch (error) {
      console.error('Error updating customer:', error);
      return {
        code: 0,
        status: false,
        message: 'เกิดข้อผิดพลาดในการอัพเดตข้อมูลลูกค้า',
        data: null
      };
    }
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