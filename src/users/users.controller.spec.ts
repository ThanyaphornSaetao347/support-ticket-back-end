import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './users.controller';
import { UserService } from './users.service';
import { Users } from './entities/user.entity';
import { UserAllowRole } from '../user_allow_role/entities/user_allow_role.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { NotFoundException } from '@nestjs/common';
import { Request } from 'express';
import { CustomerForProject } from '../customer_for_project/entities/customer-for-project.entity';
import { MasterRole } from '../master_role/entities/master_role.entity';
import { PermissionGuard } from '../permission/permission.guard';
import { JwtAuthGuard } from '../auth/jwt_auth.guard';
import { AuthGuard } from '@nestjs/passport';

interface Role {
  id: number;
  name: string;
}

describe('Usercontroller!', () => {
  let controller!: UserController;
  let service!: UserService;

  const mockRequest = {
    user: {
      id: 1,
      roles: [1, 15],
    },
  } as unknown as Request;
  const mockRole: MasterRole[] = [
    {
      id: 1,
      role_name: 'แจ้งปัญหา',
      userRole: [],        // mock relation ให้เป็น array ว่าง
      userAllowRole: [],   // mock relation ให้เป็น array ว่าง
    } as MasterRole,
  ];

  const mockUser: Users = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    password: 'hashedPassword',
    firstname: 'Test',
    lastname: 'User',
    phone: '1234567890',
    isenabled: true,
    start_date: new Date(),
    end_date: undefined,
    create_date: new Date(),
    update_date: new Date(),
    create_by: 1,
    update_by: 1,
    customerProjects: [] as CustomerForProject[],
    role: mockRole,
    userAllowRoles: [] as UserAllowRole[],
  };

  const mockUserWithoutPassword = {
    ...mockUser,
    password: undefined,
  };

  const mockUsers = [mockUserWithoutPassword];

  // เพิ่ม mock สำหรับ Permissionservice!
  describe('UserController', () => {
    let controller: UserController;
    let service: UserService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [UserController],
        providers: [
          {
            provide: UserService,
            useValue: {
              create: jest.fn(),
              userAccount: jest.fn(),
              findAll: jest.fn(),
              findOne: jest.fn(),
              update: jest.fn(),
              remove: jest.fn(),
              getUserIdsByRole: jest.fn(),
            },
          },
          {
            provide: 'Permissionservice!',
            useValue: { checkPermission: jest.fn().mockReturnValue(true) },
          },
        ],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: jest.fn(() => true) })
        .overrideGuard(PermissionGuard)
        .useValue({ canActivate: jest.fn(() => true) })
        .overrideGuard(AuthGuard('jwt'))
        .useValue({ canActivate: jest.fn(() => true) })
        .compile();

      controller = module.get<UserController>(UserController);
      service = module.get<UserService>(UserService);
    });

    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    describe('create', () => {
      it('should create a new user', async () => {
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

        const result = {
          code: '1',
          message: 'บันทึกสำเร็จ',
          data: mockUserWithoutPassword,
        };

        jest.spyOn(service!, 'create').mockResolvedValue(result as any);

        const body = { ...createUserDto, role_id: [1, 2] };
        const createdUser = await controller!.create(body, mockRequest);

        expect(createdUser).toEqual(result);
        expect(service!.create).toHaveBeenCalledWith(
          expect.objectContaining({ username: 'newuser' }),
          { role_id: [1, 2] },
        );
      });

      it('should return an error if user creation fails', async () => {
        const createUserDto: CreateUserDto = {
          username: 'existinguser',
          email: 'existing@example.com',
          password: 'password123',
          firstname: 'Existing',
          lastname: 'User',
          phone: '1234567890',
          create_by: 1,
          update_by: 1,
        };

        const errorResult = {
          code: '2',
          message: 'สร้างผู้ใช้ไม่สำเร็จ มีชื่อผู้ใช้นี้ในระบบแล้ว',
        };

        jest.spyOn(service!, 'create').mockResolvedValue(errorResult);

        const body = { ...createUserDto, role_id: [] };
        const createdUser = await controller!.create(body, mockRequest);

        expect(createdUser).toEqual(errorResult);
        expect(service!.create).toHaveBeenCalledWith(
          expect.objectContaining({ username: 'existinguser' }),
          undefined,
        );
      });
    });

    describe('getUserAccount', () => {
      it('should return user account information', async () => {
        const mockAccountData = [
          {
            name: 'Test User',
            user_email: 'test@example.com',
            company: 'Test Company',
            company_address: '123 Test St',
            user_phone: '1234567890',
            company_phone: '0987654321',
          },
        ];
        jest.spyOn(service!, 'userAccount').mockResolvedValue(mockAccountData);

        const result = await controller!.getUserAccount();

        expect(result).toEqual(mockAccountData);
        expect(service!.userAccount).toHaveBeenCalled();
      });
    });

    describe('findAll', () => {
      it('should return all users without filters', async () => {
        jest.spyOn(service!, 'findAll').mockResolvedValue(mockUsers as any);

        const result = await controller!.findAll(undefined, undefined);

        expect(result).toEqual(mockUsers);
        expect(service!.findAll).toHaveBeenCalledWith({});
      });

      it('should return users filtered by username', async () => {
        jest.spyOn(service!, 'findAll').mockResolvedValue([mockUserWithoutPassword] as any);

        const result = await controller!.findAll('testuser', undefined);

        expect(result).toEqual([mockUserWithoutPassword]);
        expect(service!.findAll).toHaveBeenCalledWith({ username: 'testuser' });
      });

      it('should return users filtered by email', async () => {
        jest.spyOn(service!, 'findAll').mockResolvedValue([mockUserWithoutPassword] as any);

        const result = await controller!.findAll(undefined, 'test@example.com');

        expect(result).toEqual([mockUserWithoutPassword]);
        expect(service!.findAll).toHaveBeenCalledWith({ email: 'test@example.com' });
      });
    });

    describe('findOne', () => {
      it('should return a single user by id', async () => {
        jest.spyOn(service!, 'findOne').mockResolvedValue(mockUserWithoutPassword as any);

        const result = await controller!.findOne('1');

        expect(result).toEqual(mockUserWithoutPassword);
        expect(service!.findOne).toHaveBeenCalledWith(1);
      });

      it('should throw NotFoundException if user not found', async () => {
        jest.spyOn(service!, 'findOne').mockRejectedValue(new NotFoundException());

        await expect(controller!.findOne('999')).rejects.toThrow(NotFoundException);
      });
    });

    describe('update', () => {
      it('should update a user successfully', async () => {
        const updateUserDto: UpdateUserDto = { firstname: 'Updated', update_by: 1 };

        const result = {
          code: '1',
          message: 'อัปเดตสำเร็จ',
          data: { ...mockUserWithoutPassword, firstname: 'Updated' },
        };

        jest.spyOn(service!, 'update').mockResolvedValue(result);

        const updatedUser = await controller!.update('1', updateUserDto, mockRequest);

        expect(updatedUser).toEqual(result);
        expect(service!.update).toHaveBeenCalledWith(1, expect.objectContaining(updateUserDto));
      });
    });

    describe('remove', () => {
      it('should remove a user successfully', async () => {
        const result = { code: '1', message: 'ลบข้อมูลสำเร็จ' };
        jest.spyOn(service!, 'remove').mockResolvedValue(result);

        const removeResult = await controller!.remove('1');

        expect(removeResult).toEqual(result);
        expect(service!.remove).toHaveBeenCalledWith(1);
      });

      it('should throw NotFoundException if user not found', async () => {
        jest.spyOn(service!, 'remove').mockRejectedValue(new NotFoundException());

        await expect(controller!.remove('999')).rejects.toThrow(NotFoundException);
      });
    });
  });
})