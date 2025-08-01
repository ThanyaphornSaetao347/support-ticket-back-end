import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { CustomerForProject } from '../customer_for_project/entities/customer-for-project.entity';
import { Customer } from '../customer/entities/customer.entity';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    
    @InjectRepository(CustomerForProject)
    private customerForProjectRepository: Repository<CustomerForProject>,
    
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
  ) {}

   // เพิ่มเมธอดสร้างโปรเจคใหม่
  async createProject(createProjectDto: CreateProjectDto) {
    try {
      const { create_by, ...projectData } = createProjectDto;

      if (!create_by) {
        throw new BadRequestException('User ID is required');
      }

      // ใช้เฉพาะฟิลด์ที่มีอยู่จริงใน Entity
      const newProject = this.projectRepository.create({
        ...projectData,
        create_by: create_by,
        isenabled: true
      });

      const savedProject = await this.projectRepository.save(newProject);

      return {
        code: 1,
        status: true,
        message: 'โปรเจคถูกสร้างเรียบร้อยแล้ว',
        data: savedProject
      };
    } catch (error) {
      console.error('Error creating project:', error);
      return {
        code: 0,
        status: false,
        message: 'เกิดข้อผิดพลาดในการสร้างโปรเจค',
        error: error.message
      };
    }
  }


  async getProjectsForUser(userId: number) {
    try {
      console.log('Getting projects for user:', userId);
      
      // ใช้ ORM QueryBuilder แทน raw query
      const results = await this.customerForProjectRepository
        .createQueryBuilder('cfp')
        .innerJoin('cfp.project', 'p')
        .innerJoin('cfp.customer', 'c')
        .where('cfp.user_id = :userId', { userId })
        .andWhere('cfp.isenabled = :enabled', { enabled: true })
        .andWhere('p.isenabled = :projectEnabled', { projectEnabled: true })
        .select([
          'p.id as project_id',
          'p.name as project_name', 
          'c.id as customer_id',
          'c.name as customer_name'
        ])
        .getRawMany();

      console.log('Query result:', results);

      if (results.length === 0) {
        return {
          code: 1,
          status: false,
          message: 'ไม่พบข้อมูลโปรเจค',
          data: [],
        };
      }

      // จัดรูปแบบข้อมูลให้เป็น dropdown format
      const formattedData = results.map(row => ({
        id: row.project_id,
        name: row.project_name,
        customer_id: row.customer_id,
        customer_name: row.customer_name,
      }));

      return {
        code: 1,
        status: true,
        message: 'Success',
        data: formattedData,
      };
    } catch (error) {
      console.error('Error in getProjectsForUser:', error);
      return {
        code: 0,
        status: false,
        message: 'Failed to fetch projects',
        error: error.message,
      };
    }
  }

  async getAllProjects() {
    try {
      // ดึงโปรเจคทั้งหมดพร้อม relations
      const projects = await this.projectRepository.find({
        where: { isenabled: true },
        relations: ['customerProjects', 'customerProjects.customer'],
        order: { name: 'ASC' },
      });

      const formattedData = projects.map(project => ({
        id: project.id,
        name: project.name,
        // description: project.description, // ลบออกถ้า entity ไม่มี field นี้
        create_date: project.create_date,
        isenabled: project.isenabled,
        customers: project.customerProjects // เปลี่ยนจาก customerForProjects
          ?.filter(cfp => cfp.isenabled)
          .map(cfp => ({
            customer_id: cfp.customer?.id,
            customer_name: cfp.customer?.name,
          })) || [],
      }));

      return {
        code: 1,
        status: true,
        message: 'Success',
        data: formattedData,
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

  // Method สำหรับหาโปรเจคตาม ID
  async getProjectById(projectId: number) {
    try {
      const project = await this.projectRepository.findOne({
        where: { id: projectId, isenabled: true },
        relations: ['customerProjects', 'customerProjects.customer', 'customerProjects.user'],
      });

      if (!project) {
        return {
          code: 0,
          status: false,
          message: 'ไม่พบโปรเจคที่ระบุ',
          data: null,
        };
      }

      const formattedData = {
        id: project.id,
        name: project.name,
        // description: project.description, // ลบออกถ้า entity ไม่มี field นี้
        create_date: project.create_date,
        isenabled: project.isenabled,
        assignments: project.customerProjects // เปลี่ยนจาก customerForProjects
          ?.filter(cfp => cfp.isenabled)
          .map(cfp => ({
            customer_id: cfp.customer?.id,
            customer_name: cfp.customer?.name,
            user_id: cfp.userId,
            user_name: cfp.users?.username || cfp.users?.email,
          })) || [],
      };

      return {
        code: 1,
        status: true,
        message: 'Success',
        data: formattedData,
      };
    } catch (error) {
      console.error('Error in getProjectById:', error);
      return {
        code: 0,
        status: false,
        message: 'Failed to fetch project',
        error: error.message,
      };
    }
  }
}
