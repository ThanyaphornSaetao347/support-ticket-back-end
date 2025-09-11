import { Test, TestingModule } from '@nestjs/testing';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { JwtAuthGuard } from '../auth/jwt_auth.guard';
import { PermissionGuard } from '../permission/permission.guard';

describe('ProjectController', () => {
  let controller: ProjectController;
  let service: ProjectService;

  const mockProjectService = {
    createProject: jest.fn(),
    getProjectsForUser: jest.fn(),
    getAllProjects: jest.fn(),
    getProjectById: jest.fn(),
  };

  const mockUser = {
    id: 1,
    sub: 1,
    userId: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectController],
      providers: [
        {
          provide: ProjectService,
          useValue: mockProjectService,
        },
      ],
    })
    .overrideGuard(JwtAuthGuard)
    .useValue({ canActivate: () => true })
    .overrideGuard(PermissionGuard)
    .useValue({ canActivate: () => true })
    .compile();

    controller = module.get<ProjectController>(ProjectController);
    service = module.get<ProjectService>(ProjectService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProjectDDL', () => {
    it('should call getProjectsForUser with user ID from request', async () => {
      const result = {
        code: 1,
        status: true,
        message: 'Success',
        data: [],
      };
      mockProjectService.getProjectsForUser.mockResolvedValue(result);

      const req = { user: mockUser };
      await controller.getProjectDDL(req);

      expect(mockProjectService.getProjectsForUser).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('createProject', () => {
    it('should call createProject with correct DTO and user ID', async () => {
      const createDto: CreateProjectDto = { name: 'New Project' };
      const expectedResult = {
        code: 1,
        status: true,
        message: 'Project created',
        data: {},
      };
      mockProjectService.createProject.mockResolvedValue(expectedResult);
      
      const req = { user: mockUser };
      const result = await controller.createProject(createDto, req);

      expect(createDto.create_by).toBe(mockUser.id);
      expect(mockProjectService.createProject).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getProjects', () => {
    it('should call getProjectsForUser with user ID from request', async () => {
      const result = {
        code: 1,
        status: true,
        message: 'Success',
        data: [],
      };
      mockProjectService.getProjectsForUser.mockResolvedValue(result);

      const req = { user: mockUser };
      await controller.getProjects(req);

      expect(mockProjectService.getProjectsForUser).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('getAllProjects', () => {
    it('should call getAllProjects from the service', async () => {
      const result = {
        code: 1,
        status: true,
        message: 'Success',
        data: [],
      };
      mockProjectService.getAllProjects.mockResolvedValue(result);

      await controller.getAllProjects();

      expect(mockProjectService.getAllProjects).toHaveBeenCalled();
    });
  });

  describe('getProjectById', () => {
    it('should call getProjectById with the correct ID', async () => {
      const id = 1;
      const result = {
        code: 1,
        status: true,
        message: 'Success',
        data: {},
      };
      mockProjectService.getProjectById.mockResolvedValue(result);

      await controller.getProjectById(id);

      expect(mockProjectService.getProjectById).toHaveBeenCalledWith(id);
    });
  });
});