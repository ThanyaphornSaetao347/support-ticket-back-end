import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Users } from './entities/user.entity';
import { UserAllowRole } from '../user_allow_role/entities/user_allow_role.entity';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
<<<<<<< HEAD
import { CreateUserAllowRoleDto } from 'src/user_allow_role/dto/create-user_allow_role.dto';
=======
>>>>>>> 44b5f76e0a11799c862a981775c1a3a71ac974a4

describe('UserService', () => {
  let service: UserService;
  let userRepository: Repository<Users>;
  let userAllowRoleRepository: Repository<UserAllowRole>;

  const mockUserRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findOneBy: jest.fn(),
  };

  const mockUserAllowRoleRepository = {
    createQueryBuilder: jest.fn(),
    count: jest.fn(),
<<<<<<< HEAD
    create: jest.fn(),      // เพิ่มบรรทัดนี้
    save: jest.fn(),        // เพิ่มบรรทัดนี้
    map: jest.fn(),         // เพิ่มบรรทัดนี้
=======
>>>>>>> 44b5f76e0a11799c862a981775c1a3a71ac974a4
  };

  const mockUser = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    password: 'hashedPassword',
    firstname: 'Test',
    lastname: 'User',
    phone: '1234567890',
    isenabled: true,
    create_by: 1,
    update_by: 1,
    create_date: new Date(),
    update_date: new Date(),
  };

  // ✅ สร้าง mock user without password แยก
  const mockUserWithoutPassword = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    firstname: 'Test',
    lastname: 'User',
    phone: '1234567890',
    isenabled: true,
    create_by: 1,
    update_by: 1,
    create_date: new Date(),
    update_date: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(Users),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(UserAllowRole),
          useValue: mockUserAllowRoleRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get<Repository<Users>>(getRepositoryToken(Users));
    userAllowRoleRepository = module.get<Repository<UserAllowRole>>(
      getRepositoryToken(UserAllowRole),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      username: 'newuser',
      email: 'newuser@example.com',
      password: 'password123',
      firstname: 'New',
      lastname: 'User',
      phone: '1234567890',
      create_by: 1,
      update_by: 1,
    };

<<<<<<< HEAD
    const createUserAllowRoleDto: CreateUserAllowRoleDto = {
      user_id: 1,         // ต้องใส่ user_id
      role_id: [1, 2, 3],    // ตามเดิม
    };

    it('should create user successfully', async () => {
      mockUserRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      // เพิ่ม mock สำหรับ UserAllowRole
      mockUserAllowRoleRepository.create.mockImplementation((data) => data);
      mockUserAllowRoleRepository.save.mockResolvedValue([
        { user_id: 1, role_id: 1 },
        { user_id: 1, role_id: 2 },
        { user_id: 1, role_id: 3 }
      ]);

      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedPassword' as never);

      const result = await service.create(createUserDto, createUserAllowRoleDto);

      expect(result.code).toBe('1');
      expect(result.message).toBe('บันทึกสำเร็จ');
=======
    it('should create user successfully', async () => {
      mockUserRepository.findOne
        .mockResolvedValueOnce(null) // username check
        .mockResolvedValueOnce(null); // email check
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedPassword' as never);

      const result = await service.create(createUserDto);

      expect(result).toEqual({
        code: '1',
        message: 'บันทึกสำเร็จ',
        data: mockUser,
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockUserRepository.save).toHaveBeenCalled();
>>>>>>> 44b5f76e0a11799c862a981775c1a3a71ac974a4
    });

    it('should return error if email is missing', async () => {
      const dtoWithoutEmail = { ...createUserDto, email: '' };

<<<<<<< HEAD
      const result = await service.create(dtoWithoutEmail, {
        user_id: 0,
        role_id: [],
      });
=======
      const result = await service.create(dtoWithoutEmail);
>>>>>>> 44b5f76e0a11799c862a981775c1a3a71ac974a4

      expect(result).toEqual({
        code: '3',
        message: 'กรุณาระบุอีเมล',
      });
    });

    it('should return error if username already exists', async () => {
      mockUserRepository.findOne.mockResolvedValueOnce(mockUser);

<<<<<<< HEAD
      const result = await service.create(createUserDto, createUserAllowRoleDto);
=======
      const result = await service.create(createUserDto);
>>>>>>> 44b5f76e0a11799c862a981775c1a3a71ac974a4

      expect(result).toEqual({
        code: '2',
        message: 'สร้างผู้ใช้ไม่สำเร็จ มีชื่อผู้ใช้นี้ในระบบแล้ว',
      });
    });

    it('should return error if email already exists', async () => {
      mockUserRepository.findOne
        .mockResolvedValueOnce(null) // username check
        .mockResolvedValueOnce(mockUser); // email check

<<<<<<< HEAD
      const result = await service.create(createUserDto, createUserAllowRoleDto);
=======
      const result = await service.create(createUserDto);
>>>>>>> 44b5f76e0a11799c862a981775c1a3a71ac974a4

      expect(result).toEqual({
        code: '2',
        message: 'สร้างผู้ใช้ไม่สำเร็จ มีอีเมลนี้ในระบบแล้ว',
      });
    });

    it('should handle save errors', async () => {
      mockUserRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockRejectedValue(new Error('Database error'));

      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedPassword' as never);

<<<<<<< HEAD
      const result = await service.create(createUserDto, createUserAllowRoleDto);
=======
      const result = await service.create(createUserDto);
>>>>>>> 44b5f76e0a11799c862a981775c1a3a71ac974a4

      expect(result).toEqual({
        code: '4',
        message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
        error: 'Database error',
      });
    });
  });

<<<<<<< HEAD

=======
>>>>>>> 44b5f76e0a11799c862a981775c1a3a71ac974a4
  describe('findByEmail', () => {
    it('should find user by email', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.findByEmail('notfound@example.com')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOne', () => {
    it('should find user by id without password', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(mockUser);

      const result = await service.findOne(1);

      // ✅ ใช้ destructuring แทน delete
      const { password, ...expectedResult } = mockUser;
      expect(result).toEqual(expectedResult);
      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByUsername', () => {
    it('should find user by username', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByUsername('testuser');

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      });
    });

    it('should return null if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.findByUsername('notfound');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById(1);

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should return null if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    const mockUsers = [
      { ...mockUser, id: 1 },
      { ...mockUser, id: 2, username: 'testuser2', email: 'test2@example.com' },
    ];

    it('should find all users without filters', async () => {
      mockUserRepository.find.mockResolvedValue(mockUsers);

      const result = await service.findAll({});

      expect(result).toEqual(mockUsers);
      expect(mockUserRepository.find).toHaveBeenCalledWith({
        where: {},
        select: expect.any(Array),
      });
    });

    it('should find users with username filter', async () => {
      mockUserRepository.find.mockResolvedValue([mockUsers[0]]);

      const result = await service.findAll({ username: 'test' });

      expect(result).toEqual([mockUsers[0]]);
      expect(mockUserRepository.find).toHaveBeenCalledWith({
        where: { username: expect.any(Object) },
        select: expect.any(Array),
      });
    });

    it('should find users with email filter', async () => {
      mockUserRepository.find.mockResolvedValue([mockUsers[1]]);

      const result = await service.findAll({ email: 'test2' });

      expect(result).toEqual([mockUsers[1]]);
      expect(mockUserRepository.find).toHaveBeenCalledWith({
        where: { email: expect.any(Object) },
        select: expect.any(Array),
      });
    });
  });

  describe('update', () => {
    const updateUserDto: UpdateUserDto = {
      firstname: 'Updated',
      lastname: 'Name',
      email: 'updated@example.com',
    };

    it('should update user successfully', async () => {
      // ✅ ใช้ mock data ที่ไม่มี password อยู่แล้ว
      mockUserRepository.findOneBy
        .mockResolvedValueOnce(mockUserWithoutPassword) // findOne call
        .mockResolvedValueOnce({
          ...mockUserWithoutPassword,
          firstname: 'Updated',
          lastname: 'Name',
          email: 'updated@example.com',
        }); // findOneBy after update

      mockUserRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.update(1, updateUserDto);

      expect(result).toEqual({
        code: '1',
        message: 'อัปเดตสำเร็จ',
        data: expect.objectContaining({
          firstname: 'Updated',
          lastname: 'Name',
          email: 'updated@example.com',
        }),
      });
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          ...updateUserDto,
          update_date: expect.any(Date),
        }),
      );
    });

    it('should hash password if provided in update', async () => {
      const updateWithPassword = { ...updateUserDto, password: 'newpassword' };

      mockUserRepository.findOneBy
        .mockResolvedValueOnce(mockUserWithoutPassword)
        .mockResolvedValueOnce({
          ...mockUserWithoutPassword,
          password: 'newHashedPassword',
        });

      mockUserRepository.update.mockResolvedValue({ affected: 1 });
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('newHashedPassword' as never);

      await service.update(1, updateWithPassword);

      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword', 10);
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          password: 'newHashedPassword',
          update_date: expect.any(Date),
        }),
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      await expect(service.update(999, updateUserDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if user not found after update', async () => {
      mockUserRepository.findOneBy
        .mockResolvedValueOnce(mockUserWithoutPassword)
        .mockResolvedValueOnce(null);

      mockUserRepository.update.mockResolvedValue({ affected: 1 });

      await expect(service.update(1, updateUserDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should remove user successfully', async () => {
      // ✅ ใช้ mock data ที่ไม่มี password อยู่แล้ว
      mockUserRepository.findOneBy.mockResolvedValue(mockUserWithoutPassword);
      mockUserRepository.delete.mockResolvedValue({ affected: 1 });

      const result = await service.remove(1);

      expect(result).toEqual({
        code: '1',
        message: 'ลบข้อมูลสำเร็จ',
      });
      expect(mockUserRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserIdsByRole', () => {
    it('should get user IDs by role successfully', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { user_id: 1 },
          { user_id: 2 },
          { user_id: 3 },
        ]),
      };

      mockUserAllowRoleRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const result = await service.getUserIdsByRole([1, 2]);

      expect(result).toEqual([1, 2, 3]);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'uar.role_id IN (:...roleIds)',
        { roleIds: [1, 2] },
      );
    });

    it('should get user IDs by role with filter', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([{ user_id: 1 }]),
      };

      mockUserAllowRoleRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const result = await service.getUserIdsByRole([1], { createBy: 2 });

      expect(result).toEqual([1]);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'uar.create_by = :createBy',
        { createBy: 2 },
      );
    });

    it('should return empty array if no users found', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      mockUserAllowRoleRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const result = await service.getUserIdsByRole([999]);

      expect(result).toEqual([]);
    });
  });

  describe('hasRole', () => {
    it('should return true if user has role', async () => {
      mockUserAllowRoleRepository.count.mockResolvedValue(1);

      const result = await service.hasRole(1, [1, 2]);

      expect(result).toBe(true);
      expect(mockUserAllowRoleRepository.count).toHaveBeenCalledWith({
        where: [{ user_id: 1, role_id: 1 }, { user_id: 1, role_id: 2 }],
      });
    });

    it('should return false if user does not have role', async () => {
      mockUserAllowRoleRepository.count.mockResolvedValue(0);

      const result = await service.hasRole(1, [999]);

      expect(result).toBe(false);
    });
  });

  describe('should be defined', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });
});