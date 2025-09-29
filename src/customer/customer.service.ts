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
          'c.id',
          'c.name',
          'c.address',
          'c.email',
          'c.telephone',
          'c.status'
        ])
        .where('isenabled = true')
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

  async getAllCustomer() {
    try {
      const customer = await this.customerRepository
        .createQueryBuilder('c')
        .select([
          'c.id as id',
          'c.name as name'
        ])
        .groupBy('c.id')
        .getRawMany();

      return {
        code: 1,
        status: true,
        message: 'Success',
        data: customer,
      };
    } catch (error) {
      console.error('Error in getAllProjects:', error);
      return {
        code: 0,
        status: false,
        message: 'Failed to fetch all projects',
        error: error.message,
      };
    }
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

    // อัพเดต fields ทีละตัว
    const fieldsToUpdate: Partial<Customer> = {};
    if (updateCustomerDto.name) fieldsToUpdate.name = updateCustomerDto.name;
    if (updateCustomerDto.address) fieldsToUpdate.address = updateCustomerDto.address;
    if (updateCustomerDto.telephone) fieldsToUpdate.telephone = updateCustomerDto.telephone;
    if (updateCustomerDto.email) fieldsToUpdate.email = updateCustomerDto.email;
    if (updateCustomerDto.status != undefined) fieldsToUpdate.status = updateCustomerDto.status;

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
}