import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { MasterRoleController } from './master_role.controller';
import { MasterRoleService } from './master_role.service';
import { CreateMasterRoleDto } from './dto/create-master_role.dto';
import { UpdateMasterRoleDto } from './dto/update-master_role.dto';

// Mock Guards
jest.mock('../auth/jwt_auth.guard', () => ({
  JwtAuthGuard: jest.fn().mockImplementation(() => true),
}));
jest.mock('../permission/permission.guard', () => ({
  PermissionGuard: jest.fn().mockImplementation(() => true),
}));
jest.mock('../permission/permission.decorator', () => ({
  RequireAnyAction: () => () => { },
}));

describe('MasterRoleController', () => {
  let controller: MasterRoleController;
  let service: MasterRoleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MasterRoleController],
      providers: [
        {
          provide: MasterRoleService,
          useValue: {
            create: jest.fn(),
            getAllRoles: jest.fn(),
            findOne: jest.fn(),
            findByName: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<MasterRoleController>(MasterRoleController);
    service = module.get<MasterRoleService>(MasterRoleService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call masterRoleService.create with the correct DTO', async () => {
      const createDto: CreateMasterRoleDto = { role_name: 'test_role' };
      await controller.create(createDto);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should call masterRoleService.getAllRoles', async () => {
      await controller.findAll();
      expect(service.getAllRoles).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should call masterRoleService.findOne with the correct ID', async () => {
      const roleId = 1;
      await controller.findOne(roleId);
      expect(service.findOne).toHaveBeenCalledWith(roleId);
    });
  });

  describe('findByName', () => {
    it('should call masterRoleService.findByName with the correct name', async () => {
      const roleName = 'test_role';
      await controller.findByName(roleName);
      expect(service.findByName).toHaveBeenCalledWith(roleName);
    });
  });

  describe('update', () => {
    it('should call masterRoleService.update with the correct ID and DTO', async () => {
      const roleId = 1;
      const updateDto: UpdateMasterRoleDto = { role_name: 'updated_role' };
      await controller.update(roleId, updateDto);
      expect(service.update).toHaveBeenCalledWith(roleId, updateDto);
    });
  });

  describe('remove', () => {
    it('should call masterRoleService.remove with the correct ID', async () => {
      const roleId = 1;
      await controller.remove(roleId);
      expect(service.remove).toHaveBeenCalledWith(roleId);
    });
  });
});