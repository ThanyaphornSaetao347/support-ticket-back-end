// src/auth/auth.controller.ts
import { Body, Controller, Post, UseGuards, Request, Get, Headers, HttpException, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt_auth.guard';

interface LoginResponse {
  code: number;
  status: boolean;
  message: string;
  user: {
    id: number;
    username: string;
  } | null;
  access_token: string | null;
  refresh_token?: string;
  expires_in?: string;
  expires_at?: string;
  token_expires_timestamp?: number;
}

// เพิ่ม interface สำหรับ refresh token response
interface RefreshTokenResponse {
  code: number;
  status: boolean;
  message: string;
  data?: any;
}

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() body: { username: string; password: string }) {
    return this.authService.register(body);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<LoginResponse> {
    console.log('Login request received:', loginDto.username);
    
    const user = await this.authService.validateUser(loginDto.username, loginDto.password);
    
    if (!user) {
      console.log('Login failed for user:', loginDto.username);
      return {
        code: 0,
        status: false,
        message: 'Invalid username or password',
        user: null,
        access_token: null
      };
    }
    
    console.log('User validated successfully, proceeding to login');

    const result: LoginResponse = await this.authService.login(user);
    
    console.log('Login response:', result);

    const correctedResponse: LoginResponse = {
      ...result,
      user: {
        id: user.id,
        username: user.username
      }
    };

    return correctedResponse;
  }

  // แก้ไข method นี้โดยระบุ return type ชัดเจน
  @Post('refresh')
  async refreshToken(@Body('refresh_token') refreshToken: string): Promise<RefreshTokenResponse> {
    try {
      if (!refreshToken) {
        throw new HttpException({
          code: 0,
          status: false,
          message: 'Refresh token is required',
          error: 'REFRESH_TOKEN_REQUIRED',
        }, HttpStatus.BAD_REQUEST);
      }

      const result = await this.authService.refreshToken(refreshToken);
      
      return {
        code: 1,
        status: true,
        message: 'Token refreshed successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException({
        code: 0,
        status: false,
        message: 'Failed to refresh token',
        error: 'REFRESH_TOKEN_INVALID',
      }, HttpStatus.UNAUTHORIZED);
    }
  }

  // เพิ่ม endpoint สำหรับตรวจสอบ profile (ทดสอบ JWT)
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    return {
      code: 1,
      status: true,
      message: 'Profile retrieved successfully',
      user: req.user,
    };
  }

  // เพิ่ม endpoint สำหรับตรวจสอบ token expiration (ปรับปรุง)
  @Get('check-token')
  @UseGuards(JwtAuthGuard)
  async checkToken(@Headers('authorization') authHeader: string, @Request() req) {
    try {
      const token = authHeader.replace('Bearer ', '');
      const tokenInfo = await this.authService.checkTokenExpiration(token);
      
      return {
        code: 1,
        status: true,
        message: 'Token status retrieved',
        data: {
          isValid: true,
          isExpiring: tokenInfo.isExpiring,
          shouldRefresh: tokenInfo.shouldRefresh,
          expiresAt: tokenInfo.expiresAt,
          minutesLeft: tokenInfo.minutesLeft,
          user: req.user,
        },
      };
    } catch (error) {
      throw new HttpException({
        code: 0,
        status: false,
        message: 'Token is invalid or expired',
        error: 'TOKEN_INVALID',
        data: {
          shouldRedirectToLogin: true,
        },
      }, HttpStatus.UNAUTHORIZED);
    }
  }

  // เพิ่ม endpoint สำหรับ logout
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Body('refresh_token') refreshToken?: string) {
    // ในระบบจริง อาจต้องเพิ่ม refresh token ลงใน blacklist
    // แต่ในกรณีนี้เราจะให้ client ลบ token เอง
    
    return {
      code: 1,
      status: true,
      message: 'Logout successful. Please remove tokens from client storage.',
      data: {
        instruction: 'Remove both access_token and refresh_token from localStorage/sessionStorage',
      },
    };
  }

  // เพิ่ม endpoint สำหรับ validate token
  @Post('validate')
  async validateToken(@Body('token') token: string) {
    try {
      if (!token) {
        throw new HttpException({
          code: 0,
          status: false,
          message: 'Token is required',
          error: 'TOKEN_REQUIRED',
        }, HttpStatus.BAD_REQUEST);
      }

      const user = await this.authService.validateToken(token);
      const tokenInfo = await this.authService.checkTokenExpiration(token);

      return {
        code: 1,
        status: true,
        message: 'Token is valid',
        data: {
          user,
          tokenInfo: {
            isExpiring: tokenInfo.isExpiring,
            shouldRefresh: tokenInfo.shouldRefresh,
            minutesLeft: tokenInfo.minutesLeft,
            expiresAt: tokenInfo.expiresAt,
          },
        },
      };
    } catch (error) {
      throw new HttpException({
        code: 0,
        status: false,
        message: error.message || 'Token is invalid or expired',
        error: error.error || 'TOKEN_INVALID',
        data: {
          shouldRedirectToLogin: true,
        },
      }, HttpStatus.UNAUTHORIZED);
    }
  }
}