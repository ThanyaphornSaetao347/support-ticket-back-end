import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Users } from '../users/entities/user.entity';
import { Repository } from 'typeorm';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<Repository<Users>>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const mockUser = {
    id: 1,
    username: 'testuser',
    password: 'hashedpassword',
  } as any;

  const mockUserWithoutPassword = {
    id: 1,
    username: 'testuser',
  };

  beforeEach(async () => {
    const mockUserRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      query: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
      decode: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(Users),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(Users));
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto = {
      username: 'newuser',
      password: 'password123',
    };

    it('should register a new user successfully', async () => {
      userRepository.findOne.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('hashedpassword' as never);
      userRepository.create.mockReturnValue(mockUser as any);
      userRepository.save.mockResolvedValue(mockUser as any);

      const result = await service.register(registerDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { username: registerDto.username },
      });
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(userRepository.create).toHaveBeenCalledWith({
        username: registerDto.username,
        password: 'hashedpassword',
      });
      expect(userRepository.save).toHaveBeenCalled();
      expect(result).toEqual({
        code: 1,
        status: true,
        message: 'User registered successfully',
      });
    });

    it('should throw error if username already exists', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any);

      await expect(service.register(registerDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('validateUser', () => {
    it('should return user data without password when credentials are valid', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any);
      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.validateUser('testuser', 'password123');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { username: 'testuser' },
        select: ['id', 'username', 'password'],
      });
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('password123', 'hashedpassword');
      expect(result).toEqual(mockUserWithoutPassword);
    });

    it('should return null when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent', 'password123');

      expect(result).toBeNull();
    });

    it('should return null when password is invalid', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      const result = await service.validateUser('testuser', 'wrongpassword');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    const mockPermissions = [1, 2, 3];

    beforeEach(() => {
      configService.get.mockReturnValue('3h');
      jwtService.sign.mockReturnValue('mock-jwt-token');
      jest.spyOn(service, 'getUserPermissions').mockResolvedValue(mockPermissions);
    });

    it('should login user successfully', async () => {
      const user = mockUserWithoutPassword;
      
      const result = await service.login(user);

      expect(jwtService.sign).toHaveBeenCalledWith({
        username: user.username,
        sub: user.id,
      });
      expect(service.getUserPermissions).toHaveBeenCalledWith(user.id);
      expect(result.code).toBe(1);
      expect(result.status).toBe(true);
      expect(result.access_token).toBe('mock-jwt-token');
      expect(result.permission).toEqual(mockPermissions);
      expect(result.user).toEqual(user);
    });

    it('should return error for invalid user data', async () => {
      const invalidUser = null;

      const result = await service.login(invalidUser);

      expect(result).toEqual({
        code: 0,
        status: false,
        message: 'Invalid user data',
        user: null,
        access_token: null,
      });
    });

    it('should return error for user without required fields', async () => {
      const incompleteUser = { username: 'test' };

      const result = await service.login(incompleteUser);

      expect(result.code).toBe(0);
      expect(result.status).toBe(false);
    });
  });

  describe('getUserPermissions', () => {
    it('should return user permissions', async () => {
      const mockRoles = [{ role_id: 1 }, { role_id: 2 }, { role_id: 3 }];
      userRepository.query.mockResolvedValue(mockRoles);

      const result = await service.getUserPermissions(1);

      expect(userRepository.query).toHaveBeenCalledTimes(1);
      expect(userRepository.query).toHaveBeenCalledWith(
        expect.any(String),
        [1],
      );
      expect(result).toEqual([1, 2, 3]);
    });

    it('should return empty array when no roles found', async () => {
      userRepository.query.mockResolvedValue([]);

      const result = await service.getUserPermissions(1);

      expect(result).toEqual([]);
    });

    it('should return empty array on database error', async () => {
      userRepository.query.mockRejectedValue(new Error('Database error'));

      const result = await service.getUserPermissions(1);

      expect(result).toEqual([]);
    });
  });

  describe('validateToken', () => {
    it('should validate token and return user', async () => {
      const mockDecoded = { sub: 1, username: 'testuser' };
      jwtService.verify.mockReturnValue(mockDecoded);
      userRepository.findOne.mockResolvedValue(mockUserWithoutPassword as any);

      const result = await service.validateToken('valid-token');

      expect(jwtService.verify).toHaveBeenCalledWith('valid-token');
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        select: ['id', 'username'],
      });
      expect(result).toEqual(mockUserWithoutPassword);
    });

    it('should throw UnauthorizedException for expired token', async () => {
      const expiredError = new Error('Token expired');
      expiredError.name = 'TokenExpiredError';
      jwtService.verify.mockImplementation(() => {
        throw expiredError;
      });

      await expect(service.validateToken('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      const mockDecoded = { sub: 999, username: 'nonexistent' };
      jwtService.verify.mockReturnValue(mockDecoded);
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.validateToken('valid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.validateToken('invalid-token')).rejects.toThrow(
        'Invalid token',
      );
    });
  });

  describe('checkTokenExpiration', () => {
    it('should return token expiration info when token is valid', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 1800; // 30 minutes from now
      const mockDecoded = { exp: futureExp };
      jwtService.decode.mockReturnValue(mockDecoded);

      const result = await service.checkTokenExpiration('valid-token');

      expect(result.isExpiring).toBe(false);
      expect(result.shouldRefresh).toBe(false);
      expect(result.minutesLeft).toBeGreaterThan(15);
    });

    it('should return expiring status when token has less than 15 minutes', async () => {
      const soonExp = Math.floor(Date.now() / 1000) + 600; // 10 minutes from now
      const mockDecoded = { exp: soonExp };
      jwtService.decode.mockReturnValue(mockDecoded);

      const result = await service.checkTokenExpiration('expiring-token');

      expect(result.isExpiring).toBe(true);
      expect(result.shouldRefresh).toBe(false);
    });

    it('should return should refresh when token has less than 5 minutes', async () => {
      const refreshExp = Math.floor(Date.now() / 1000) + 240; // 4 minutes from now
      const mockDecoded = { exp: refreshExp };
      jwtService.decode.mockReturnValue(mockDecoded);

      const result = await service.checkTokenExpiration('refresh-token');

      expect(result.isExpiring).toBe(true);
      expect(result.shouldRefresh).toBe(true);
    });

    it('should return expired status when decode fails', async () => {
      jwtService.decode.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await service.checkTokenExpiration('invalid-token');

      expect(result.isExpiring).toBe(true);
      expect(result.shouldRefresh).toBe(true);
      expect(result.minutesLeft).toBe(0);
    });
  });
});