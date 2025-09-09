import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: Partial<AuthService>;

  beforeEach(async () => {
    // Create mock service with all methods
    const mockAuthService = {
      register: jest.fn(),
      validateUser: jest.fn(),
      login: jest.fn(),
      getUserPermissions: jest.fn(),
      checkTokenExpiration: jest.fn(),
      validateToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register user successfully', async () => {
      const registerDto = {
        username: 'newuser',
        password: 'password123',
      };

      const expectedResult = {
        code: 1,
        status: true,
        message: 'User registered successfully',
      };

      authService.register = jest.fn().mockResolvedValue(expectedResult);

      const result = await controller.register(registerDto);

      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      username: 'testuser',
      password: 'password123',
    };

    it('should login successfully with valid credentials', async () => {
      const mockUser = { id: 1, username: 'testuser' };
      const mockLoginResponse = {
        code: 1,
        status: true,
        message: 'Login successful',
        user: mockUser,
        access_token: 'mock-jwt-token',
        expires_in: '3h',
        expires_at: '2024-01-01T12:00:00.000Z',
        token_expires_timestamp: 1704110400,
        permission: [1, 2, 3],
      };

      authService.validateUser = jest.fn().mockResolvedValue(mockUser);
      authService.login = jest.fn().mockResolvedValue(mockLoginResponse);

      const result = await controller.login(loginDto);

      expect(authService.validateUser).toHaveBeenCalledWith(
        loginDto.username,
        loginDto.password,
      );
      expect(authService.login).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockLoginResponse);
    });

    it('should return error response for invalid credentials', async () => {
      authService.validateUser = jest.fn().mockResolvedValue(null);

      const result = await controller.login(loginDto);

      expect(authService.validateUser).toHaveBeenCalledWith(
        loginDto.username,
        loginDto.password,
      );
      expect(authService.login).not.toHaveBeenCalled();
      expect(result).toEqual({
        code: 0,
        status: false,
        message: 'Invalid username or password',
        user: null,
        access_token: null,
      });
    });
  });

  describe('getProfile', () => {
    it('should return user profile with permissions', async () => {
      const mockRequest = {
        user: { id: 1, username: 'testuser' },
      };
      const mockPermissions = [1, 2, 3];

      authService.getUserPermissions = jest.fn().mockResolvedValue(mockPermissions);

      const result = await controller.getProfile(mockRequest);

      expect(authService.getUserPermissions).toHaveBeenCalledWith(1);
      expect(result).toEqual({
        code: 1,
        status: true,
        message: 'Profile retrieved successfully',
        user: mockRequest.user,
        permission: mockPermissions,
      });
    });
  });

  describe('checkToken', () => {
    it('should return token status when token is valid', async () => {
      const authHeader = 'Bearer mock-jwt-token';
      const mockRequest = {
        user: { id: 1, username: 'testuser' },
      };
      const mockTokenInfo = {
        isExpiring: false,
        shouldRefresh: false,
        expiresAt: new Date('2024-01-01T12:00:00.000Z'),
        minutesLeft: 30,
      };
      const mockPermissions = [1, 2, 3];

      authService.checkTokenExpiration = jest.fn().mockResolvedValue(mockTokenInfo);
      authService.getUserPermissions = jest.fn().mockResolvedValue(mockPermissions);

      const result = await controller.checkToken(authHeader, mockRequest);

      expect(authService.checkTokenExpiration).toHaveBeenCalledWith('mock-jwt-token');
      expect(authService.getUserPermissions).toHaveBeenCalledWith(1);
      expect(result).toEqual({
        code: 1,
        status: true,
        message: 'Token status retrieved',
        data: {
          isValid: true,
          isExpiring: mockTokenInfo.isExpiring,
          shouldRefresh: mockTokenInfo.shouldRefresh,
          expiresAt: mockTokenInfo.expiresAt,
          minutesLeft: mockTokenInfo.minutesLeft,
          user: mockRequest.user,
          permission: mockPermissions,
        },
      });
    });

    it('should throw HttpException when token check fails', async () => {
      const authHeader = 'Bearer invalid-token';
      const mockRequest = {
        user: { id: 1, username: 'testuser' },
      };

      authService.checkTokenExpiration = jest.fn().mockRejectedValue(new Error('Token expired'));

      await expect(
        controller.checkToken(authHeader, mockRequest),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('logout', () => {
    it('should return logout success message', async () => {
      const result = await controller.logout();

      expect(result).toEqual({
        code: 1,
        status: true,
        message: 'Logout successful. Please remove token from client storage.',
        data: {
          instruction: 'Remove access_token from localStorage/sessionStorage',
        },
      });
    });
  });

  describe('validateToken', () => {
    const token = 'mock-jwt-token';

    it('should validate token successfully', async () => {
      const mockUser = { id: 1, username: 'testuser' };
      const mockTokenInfo = {
        isExpiring: false,
        shouldRefresh: false,
        expiresAt: new Date('2024-01-01T12:00:00.000Z'),
        minutesLeft: 30,
      };
      const mockPermissions = [1, 2, 3];

      authService.validateToken = jest.fn().mockResolvedValue(mockUser);
      authService.checkTokenExpiration = jest.fn().mockResolvedValue(mockTokenInfo);
      authService.getUserPermissions = jest.fn().mockResolvedValue(mockPermissions);

      const result = await controller.validateToken(token);

      expect(authService.validateToken).toHaveBeenCalledWith(token);
      expect(authService.checkTokenExpiration).toHaveBeenCalledWith(token);
      expect(authService.getUserPermissions).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual({
        code: 1,
        status: true,
        message: 'Token is valid',
        data: {
          user: mockUser,
          permission: mockPermissions,
          tokenInfo: {
            isExpiring: mockTokenInfo.isExpiring,
            shouldRefresh: mockTokenInfo.shouldRefresh,
            minutesLeft: mockTokenInfo.minutesLeft,
            expiresAt: mockTokenInfo.expiresAt,
          },
        },
      });
    });

    it('should throw HttpException when token is missing', async () => {
      await expect(controller.validateToken('')).rejects.toThrow(HttpException);
    });

    it('should throw HttpException when token validation fails', async () => {
      authService.validateToken = jest.fn().mockRejectedValue(new Error('Token expired'));

      await expect(controller.validateToken(token)).rejects.toThrow(HttpException);
    });
  });
});