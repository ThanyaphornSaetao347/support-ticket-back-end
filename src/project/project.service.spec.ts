import { Test, TestingModule } from '@nestjs/testing';
import { ProjectService } from './project.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { CustomerForProject } from '../customer_for_project/entities/customer-for-project.entity';
import { Customer } from '../customer/entities/customer.entity';
import { CreateProjectDto } from './dto/create-project.dto';

describe('ProjectService', () => {
  let service: ProjectService;
  let projectRepository: jest.Mocked<Repository<Project>>;
  let customerForProjectRepository: jest.Mocked<Repository<CustomerForProject>>;
  let customerRepository: jest.Mocked<Repository<Customer>>;

  const mockProject = {
    id: 1,
    name: 'Test Project',
    create_date: new Date(),
    create_by: 1,
    isenabled: true,
  };

  const createMockRepository = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
    }),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        {
          provide: getRepositoryToken(Project),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(CustomerForProject),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(Customer),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
    projectRepository = module.get(getRepositoryToken(Project));
    customerForProjectRepository = module.get(getRepositoryToken(CustomerForProject));
    customerRepository = module.get(getRepositoryToken(Customer));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createProject', () => {
    it('should create project successfully', async () => {
      const createProjectDto: CreateProjectDto = {
        name: 'New Project',
        create_by: 1,
        status: true,
      };

      projectRepository.create.mockReturnValueOnce(mockProject as any);
      projectRepository.save.mockResolvedValueOnce(mockProject as any);

      const result = await service.createProject(createProjectDto);

      expect(projectRepository.create).toHaveBeenCalledWith({
        name: createProjectDto.name,
        create_by: createProjectDto.create_by,
        isenabled: true,
      });
      expect(projectRepository.save).toHaveBeenCalled();
      expect(result).toEqual({
        code: 1,
        status: true,
        message: 'โปรเจคถูกสร้างเรียบร้อยแล้ว',
        data: mockProject,
      });
    });

    it('should return error when create_by is missing', async () => {
      const createProjectDto: CreateProjectDto = {
        name: 'New Project',
        status: true,
      };

      const result = await service.createProject(createProjectDto);

      expect(result).toEqual({
        code: 0,
        status: false,
        message: 'เกิดข้อผิดพลาดในการสร้างโปรเจค',
        error: 'User ID is required',
      });
    });

    it('should handle database error', async () => {
      const createProjectDto: CreateProjectDto = {
        name: 'New Project',
        create_by: 1,
        status: true,
      };

      projectRepository.create.mockReturnValueOnce(mockProject as any);
      projectRepository.save.mockRejectedValueOnce(new Error('Database error'));

      const result = await service.createProject(createProjectDto);

      expect(result).toEqual({
        code: 0,
        status: false,
        message: 'เกิดข้อผิดพลาดในการสร้างโปรเจค',
        error: 'Database error',
      });
    });
  });

  describe('getProjectsForUser', () => {
    it('should get projects for user successfully', async () => {
      const userId = 1;
      const mockResults = [
        {
          project_id: 1,
          project_name: 'Test Project',
          customer_id: 1,
          customer_name: 'Test Customer',
        },
      ];

      (customerForProjectRepository.createQueryBuilder().getRawMany as jest.Mock).mockResolvedValueOnce(
        mockResults,
      );

      const result = await service.getProjectsForUser(userId);

      expect(customerForProjectRepository.createQueryBuilder).toHaveBeenCalled();
      expect(result).toEqual({
        code: 1,
        status: true,
        message: 'Success',
        data: [
          {
            id: 1,
            name: 'Test Project',
            customer_id: 1,
            customer_name: 'Test Customer',
          },
        ],
      });
    });

    it('should return empty result when no projects found', async () => {
      const userId = 999;

      (customerForProjectRepository.createQueryBuilder().getRawMany as jest.Mock).mockResolvedValueOnce([]);

      const result = await service.getProjectsForUser(userId);

      expect(result).toEqual({
        code: 1,
        status: false,
        message: 'ไม่พบข้อมูลโปรเจค',
        data: [],
      });
    });

    it('should handle database error', async () => {
      const userId = 1;

      (customerForProjectRepository.createQueryBuilder().getRawMany as jest.Mock).mockRejectedValueOnce(
        new Error('Database error'),
      );

      const result = await service.getProjectsForUser(userId);

      expect(result).toEqual({
        code: 0,
        status: false,
        message: 'Failed to fetch projects',
        error: 'Database error',
      });
    });
  });

  describe('getAllProjects', () => {
    it('should get all projects successfully', async () => {
      const projects = [
        {
          ...mockProject,
          customerProjects: [
            {
              isenabled: true,
              customer: {
                id: 1,
                name: 'Test Customer',
              },
            },
          ],
        },
      ];

      projectRepository.find.mockResolvedValueOnce(projects as any);

      const result = await service.getAllProjects();

      expect(projectRepository.find).toHaveBeenCalledWith({
        where: { isenabled: true },
        relations: ['customerProjects', 'customerProjects.customer'],
        order: { name: 'ASC' },
      });
      expect(result).toEqual({
        code: 1,
        status: true,
        message: 'Success',
        data: [
          {
            id: mockProject.id,
            name: mockProject.name,
            create_date: mockProject.create_date,
            isenabled: mockProject.isenabled,
            customers: [
              {
                customer_id: 1,
                customer_name: 'Test Customer',
              },
            ],
          },
        ],
      });
    });

    it('should handle empty projects', async () => {
      projectRepository.find.mockResolvedValueOnce([]);

      const result = await service.getAllProjects();

      expect(result).toEqual({
        code: 1,
        status: true,
        message: 'Success',
        data: [],
      });
    });

    it('should handle database error', async () => {
      projectRepository.find.mockRejectedValueOnce(new Error('Database error'));

      const result = await service.getAllProjects();

      expect(result).toEqual({
        code: 0,
        status: false,
        message: 'Failed to fetch all projects',
        error: 'Database error',
      });
    });
  });

  describe('getProjectById', () => {
    it('should get project by id successfully', async () => {
      const projectId = 1;
      const project = {
        ...mockProject,
        customerProjects: [
          {
            isenabled: true,
            customer: {
              id: 1,
              name: 'Test Customer',
            },
            userId: 2,
            users: {
              username: 'testuser',
              email: 'test@example.com',
            },
          },
        ],
      };

      projectRepository.findOne.mockResolvedValueOnce(project as any);

      const result = await service.getProjectById(projectId);

      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: { id: projectId, isenabled: true },
        relations: ['customerProjects', 'customerProjects.customer', 'customerProjects.user'],
      });
      expect(result).toEqual({
        code: 1,
        status: true,
        message: 'Success',
        data: {
          id: project.id,
          name: project.name,
          create_date: project.create_date,
          isenabled: project.isenabled,
          assignments: [
            {
              customer_id: 1,
              customer_name: 'Test Customer',
              user_id: 2,
              user_name: 'testuser',
            },
          ],
        },
      });
    });

    it('should return error when project not found', async () => {
      const projectId = 999;

      projectRepository.findOne.mockResolvedValueOnce(null);

      const result = await service.getProjectById(projectId);

      expect(result).toEqual({
        code: 0,
        status: false,
        message: 'ไม่พบโปรเจคที่ระบุ',
        data: null,
      });
    });

    it('should handle database error', async () => {
      const projectId = 1;

      projectRepository.findOne.mockRejectedValueOnce(new Error('Database error'));

      const result = await service.getProjectById(projectId);

      expect(result).toEqual({
        code: 0,
        status: false,
        message: 'Failed to fetch project',
        error: 'Database error',
      });
    });
  });
});