// ต้องแน่ใจว่านี่เป็นไฟล์ customer_for_project.service.ts ทั้งหมด
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerForProject } from './entities/customer-for-project.entity';
import { Project } from '../project/entities/project.entity';
import { Customer } from '../customer/entities/customer.entity';
import { CreateCustomerForProjectDto } from './dto/create-customer_for_project.dto';
import { UpdateCustomerForProjectDto } from './dto/update-customer_for_project.dto';

@Injectable()
export class CustomerForProjectService {
  constructor(
    @InjectRepository(CustomerForProject)
    private customerForProjectRepository: Repository<CustomerForProject>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>
  ) {}

  async create(createDto: CreateCustomerForProjectDto) {
  // 1. ตรวจสอบข้อมูลที่จำเป็นก่อน
    if (!createDto.project_id) {
      return {
        code: '0',
        status: false,
        message: 'Project ID is required',
        data: null
      };
    }

    if (!createDto.customer_id) {
      return {
        code: '0',
        status: false,
        message: 'Customer ID is required',
        data: null
      };
    }

    if (!createDto.user_id) {
      return {
        code: '0',
        status: false,
        message: 'User ID is required',
        data: null
      };
    }

    // 2. ตรวจสอบว่า project_id ที่ส่งมามีอยู่จริง
    const project = await this.projectRepository.findOneBy({ id: createDto.project_id });
    if (!project) {
      return {
        code: '0',
        status: false,
        message: 'ไม่พบข้อมูลโปรเจค',
        data: null,
      };
    }

    // 3. ตรวจสอบว่า customer_id ที่ส่งมามีอยู่จริง
    const customer = await this.customerRepository.findOneBy({ id: createDto.customer_id });
    if (!customer) {
      return {
        code: '0',
        status: false,
        message: 'ไม่พบข้อมูลลูกค้า',
        data: null,
      };
    }

    // 4. ตรวจสอบว่ามีข้อมูลซ้ำหรือไม่
    const existingRecord = await this.customerForProjectRepository.findOne({
      where: {
        customerId: createDto.customer_id,
        projectId: createDto.project_id,
        userId: createDto.user_id,
        isenabled: true
      }
    });

    if (existingRecord) {
      return {
        code: '0',
        status: false,
        message: 'ข้อมูลนี้มีอยู่ในระบบแล้ว',
        data: null
      };
    }

    // 5. สร้างข้อมูล CustomerForProject
    const customerForProject = new CustomerForProject();
    customerForProject.userId = createDto.user_id;
    customerForProject.customerId = createDto.customer_id;
    customerForProject.projectId = createDto.project_id;
    customerForProject.create_by = createDto.user_id;
    customerForProject.update_by = createDto.user_id;
    customerForProject.isenabled = true;

    // 6. บันทึกข้อมูลลงฐานข้อมูล
    const savedRecord = await this.customerForProjectRepository.save(customerForProject);

    // 7. ส่งผลลัพธ์กลับ
    return {
      code: '2',
      status: true,
      message: 'สร้างข้อมูลสำเร็จ',
      data: savedRecord,
    };
  }

  async findAll() {
    const records = await this.customerForProjectRepository.find({
      where: { isenabled: true },
      relations: ['users', 'project', 'customer']
    });
    
    return {
      code: '2',
      status: true,
      message: 'Success',
      data: records
    };
  }

  async findAllByUser(userId: number) {
    const records = await this.customerForProjectRepository.find({
      where: { userId: userId, isenabled: true },
      relations: ['customer', 'project'],
      order: { create_date: 'DESC' }
    });

    const customerMap = new Map();

    records.forEach(record => {
      if (!customerMap.has(record.customer.id)) {
        customerMap.set(record.customer.id, {
          customerId: record.customer.id,
          customerName: record.customer.name,
          project: []
        });
      }

      customerMap.get(record.customer.id).project.push({
        projectId: record.project.id,
        projectName: record.project.name
      });
    });

    return {
      code: '2',
      status: true,
      message: 'Success',
      data: records.map(record => ({
        id: record.id,
        customer: {
          id: record.customer.id,
          name: record.customer.name
        },
        project: {
          id: record.project.id,
          name: record.project.name
        },
        createDate: record.create_date
      }))
    };
  }

  async findOne(id: number) {
    const record = await this.customerForProjectRepository.findOne({
      where: { id, isenabled: true },
      relations: ['users', 'project', 'customer']
    });
    
    if (!record) {
      return {
        status: 0,
        message: 'ไม่พบข้อมูล',
        data: null
      };
    }
    
    return {
      status: 1,
      message: 'Success',
      data: record
    };
  }

  async update(id: number, updateDto: UpdateCustomerForProjectDto, userId: number) {
    const record = await this.customerForProjectRepository.findOneBy({ id, isenabled: true });
    
    if (!record) {
      return {
        status: 0,
        message: 'ไม่พบข้อมูล',
        data: null
      };
    }
    
    // ตรวจสอบการแก้ไขข้อมูล project และ customer ถ้ามีการส่งมา
    if (updateDto.project_id) {
      const project = await this.projectRepository.findOneBy({ id: updateDto.project_id });
      if (!project) {
        return {
          status: 0,
          message: 'ไม่พบข้อมูลโปรเจค',
          data: null
        };
      }
      record.projectId = updateDto.project_id;
    }
    
    if (updateDto.customer_id) {
      const customer = await this.customerRepository.findOneBy({ id: updateDto.customer_id });
      if (!customer) {
        return {
          status: 0,
          message: 'ไม่พบข้อมูลลูกค้า',
          data: null
        };
      }
      record.customerId = updateDto.customer_id;
    }
    
    // เพิ่มการอัพเดท userId ตรงนี้
    if (updateDto.user_id !== undefined) {
      record.userId = updateDto.user_id; // เพิ่มบรรทัดนี้
      record.update_by = updateDto.user_id;
    }
    
    record.update_date = new Date();
    
    await this.customerForProjectRepository.save(record);
    
    return {
      status: 1,
      message: 'อัพเดทข้อมูลสำเร็จ',
      data: record
    };
  }

  async remove(id: number) {
    const record = await this.customerForProjectRepository.findOneBy({ id, isenabled: true });
    
    if (!record) {
      return {
        status: 0,
        message: 'ไม่พบข้อมูล',
        data: null
      };
    }
    
    // Soft delete โดยเปลี่ยนค่า isenabled เป็น false
    record.isenabled = false;
    await this.customerForProjectRepository.save(record);
    
    return {
      status: 1,
      message: 'ลบข้อมูลสำเร็จ',
      data: null
    };
  }

  // เพิ่มเมธอดนี้ใน CustomerForProjectService
  async changeUserAssignment(id: number, newUserId: number, currentUserId: number) {
    const record = await this.customerForProjectRepository.findOneBy({ id, isenabled: true });
    
    if (!record) {
      return {
        status: 0,
        message: 'ไม่พบข้อมูล',
        data: null
      };
    }
    
    // อัพเดทข้อมูล user_id
    record.userId = newUserId;
    record.update_date = new Date();
    record.update_by = currentUserId;
    
    await this.customerForProjectRepository.save(record);
    
    return {
      status: 1,
      message: 'เปลี่ยนผู้รับผิดชอบสำเร็จ',
      data: record
    };
  }

   // เพิ่มเมธอดใหม่สำหรับดึงข้อมูลลูกค้าตามโปรเจค
  async getCustomersByProject(projectId: number) {
    const records = await this.customerForProjectRepository.find({
      where: { projectId: projectId, isenabled: true },
      relations: ['customer']
    });

    if (records.length === 0) {
      return {
        status: 0,
        message: 'ไม่พบข้อมูลลูกค้าในโปรเจคนี้',
        data: null
      };
    }

    return {
      status: 1,
      message: 'Success',
      data: records.map(record => ({
        id: record.id,
        customer: {
          id: record.customer.id,
          name: record.customer.name,
          email: record.customer.email,
          telephone: record.customer.telephone
        }
      }))
    };
  }

  // เพิ่มเมธอดใหม่สำหรับดึงข้อมูลโปรเจคตามลูกค้า
  async getProjectsByCustomer(customerId: number) {
    const records = await this.customerForProjectRepository.find({
      where: { customerId: customerId, isenabled: true },
      relations: ['project']
    });

    if (records.length === 0) {
      return {
        status: 0,
        message: 'ไม่พบข้อมูลโปรเจคของลูกค้านี้',
        data: null
      };
    }

    return {
      status: 1,
      message: 'Success',
      data: records.map(record => ({
        id: record.id,
        project: {
          id: record.project.id,
          name: record.project.name
        }
      }))
    };
  }

  // เพิ่มเมธอดใน CustomerForProjectService
  async getUsersByCustomer(customerId: number) {
    const records = await this.customerForProjectRepository.find({
      where: { customerId: customerId, isenabled: true },
      relations: ['users']
    });

    if (records.length === 0) {
      return {
        status: 0,
        message: 'ไม่พบข้อมูล users ของลูกค้านี้',
        data: null
      };
    }

    // สร้าง array ของ users (ไม่ซ้ำกัน)
    const userMap = new Map();
    records.forEach(record => {
      if (!userMap.has(record.users.id)) {
        userMap.set(record.users.id, {
          id: record.users.id,
          name: record.users.username,
          email: record.users.email,
          firstname: record.users.firstname,
          lastname: record.users.lastname,
          phone: record.users.phone
        });
      }
    });

    return {
      code: '2',
      status: true,
      message: 'Success',
      data: Array.from(userMap.values())
    };
  }

  async getCustomerProjectsByUser(userId: number) {
    const records = await this.customerForProjectRepository.find({
      where: { userId: userId, isenabled: true },
      relations: ['customer','project']
    });

    if (records.length === 0) {
      return {
        code: '0',
        status: false,
        message: 'ไม่พบข้อมูลลูกค้าและโปรเจคของ user นี้',
        data: null
      };
    }

     // จัดกลุ่มข้อมูลตามลูกค้า
    const customerMap = new Map();
    
    records.forEach(record => {
      if (!customerMap.has(record.customer.id)) {
        customerMap.set(record.customer.id, {
          id: record.customer.id,
          name: record.customer.name,
          projects: []
        });
      }
      
      customerMap.get(record.customer.id).projects.push({
        id: record.project.id,
        name: record.project.name,
      });
    });

    return {
      code: '2',
      status: true,
      message: 'Success',
      data: Array.from(customerMap.values())
    };
  }
}
