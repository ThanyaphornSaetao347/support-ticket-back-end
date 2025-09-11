import { Test, TestingModule } from '@nestjs/testing';
import { MasterRoleService } from './master_role.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MasterRole } from './entities/master_role.entity';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CreateMasterRoleDto } from './dto/create-master_role.dto';
import { UpdateMasterRoleDto } from './dto/update-master_role.dto';
import { Users } from '../users/entities/user.entity';

describe('MasterRoleService', () => {
  let service: MasterRoleService;
  let repo: Repository<MasterRole>;

  const mockMasterRole = {
    id: 1,
    role_name: 'test_role',
    userRole: [],
    userAllowRole: []
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MasterRoleService,
        {
          provide: getRepositoryToken(MasterRole),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<MasterRoleService>(MasterRoleService);
    repo = module.get<Repository<MasterRole>>(getRepositoryToken(MasterRole));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create a new role', async () => {
      const createDto: CreateMasterRoleDto = { role_name: 'new_role' };
      jest.spyOn(repo, 'findOne').mockResolvedValue(null);
      jest.spyOn(repo, 'create').mockReturnValue({ id: 2, ...createDto } as MasterRole);
      jest.spyOn(repo, 'save').mockResolvedValue({ id: 2, ...createDto } as MasterRole);

      await expect(service.create(createDto)).resolves.toEqual({ id: 2, ...createDto });
      expect(repo.findOne).toHaveBeenCalledWith({ where: { role_name: createDto.role_name } });
      expect(repo.create).toHaveBeenCalledWith(createDto);
      expect(repo.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if role name already exists', async () => {
      const createDto: CreateMasterRoleDto = { role_name: 'test_role' };
      jest.spyOn(repo, 'findOne').mockResolvedValue(mockMasterRole as MasterRole);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return an array of roles with relations', async () => {
      const roles = [mockMasterRole];
      jest.spyOn(repo, 'find').mockResolvedValue(roles as MasterRole[]);
      await expect(service.findAll()).resolves.toEqual(roles);
      expect(repo.find).toHaveBeenCalledWith({ relations: ['userAllowRoles'] });
    });
  });

  describe('findOne', () => {
    it('should return a single role if found', async () => {
      jest.spyOn(repo, 'findOne').mockResolvedValue(mockMasterRole as MasterRole);
      await expect(service.findOne(1)).resolves.toEqual(mockMasterRole);
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 1 }, relations: ['userAllowRoles'] });
    });

    it('should throw NotFoundException if role not found', async () => {
      jest.spyOn(repo, 'findOne').mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should successfully update a role', async () => {
      const updateDto: UpdateMasterRoleDto = { role_name: 'updated_role' };
      jest.spyOn(service, 'findOne').mockResolvedValue(mockMasterRole as MasterRole);
      jest.spyOn(repo, 'findOne').mockResolvedValue(null);
      jest.spyOn(repo, 'save').mockResolvedValue({ ...mockMasterRole, ...updateDto } as MasterRole);

      await expect(service.update(1, updateDto)).resolves.toEqual({ ...mockMasterRole, ...updateDto });
      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(repo.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if updated role name already exists', async () => {
      const updateDto: UpdateMasterRoleDto = { role_name: 'existing_role' };
      const existingRole = { id: 2, role_name: 'existing_role' };
      jest.spyOn(service, 'findOne').mockResolvedValue(mockMasterRole as MasterRole);
      jest.spyOn(repo, 'findOne').mockResolvedValue(existingRole as MasterRole);

      await expect(service.update(1, updateDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should successfully remove a role', async () => {
      jest.spyOn(repo, 'findOne').mockResolvedValue({ ...mockMasterRole, userAllowRole: [] } as MasterRole);
      jest.spyOn(repo, 'remove').mockResolvedValue(mockMasterRole as MasterRole);

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 1 }, relations: ['userAllowRoles'] });
      expect(repo.remove).toHaveBeenCalledWith({ ...mockMasterRole, userAllowRole: [] });
    });

    it('should throw NotFoundException if role not found', async () => {
      jest.spyOn(repo, 'findOne').mockResolvedValue(null);
      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if role is assigned to users', async () => {
      const roleWithUsers = { ...mockMasterRole, userAllowRole: [{ id: 1 } as Users] };
      jest.spyOn(repo, 'findOne').mockResolvedValue(roleWithUsers as MasterRole);
      await expect(service.remove(1)).rejects.toThrow(ConflictException);
    });
  });

  describe('findByName', () => {
    it('should return a role by name', async () => {
      jest.spyOn(repo, 'findOne').mockResolvedValue(mockMasterRole as MasterRole);
      await expect(service.findByName('test_role')).resolves.toEqual(mockMasterRole);
      expect(repo.findOne).toHaveBeenCalledWith({ where: { role_name: 'test_role' } });
    });

    it('should throw NotFoundException if role not found by name', async () => {
      jest.spyOn(repo, 'findOne').mockResolvedValue(null);
      await expect(service.findByName('non_existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAllRoles', () => {
    it('should return all roles ordered by ID', async () => {
      const roles = [mockMasterRole];
      jest.spyOn(repo, 'find').mockResolvedValue(roles as MasterRole[]);
      await expect(service.getAllRoles()).resolves.toEqual(roles);
      expect(repo.find).toHaveBeenCalledWith({ order: { id: 'ASC' } });
    });
  });

  describe('getRoleById', () => {
    it('should return a single role by ID', async () => {
      jest.spyOn(repo, 'findOne').mockResolvedValue(mockMasterRole as MasterRole);
      await expect(service.getRoleById(1)).resolves.toEqual(mockMasterRole);
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should return null if role not found by ID', async () => {
      jest.spyOn(repo, 'findOne').mockResolvedValue(null);
      await expect(service.getRoleById(999)).resolves.toBeNull();
    });
  });
});