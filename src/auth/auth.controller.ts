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

  // เพิ่ม endpoint สำหรับตรวจสอบ token expiration
  @Get('check-token')
  @UseGuards(JwtAuthGuard)
  async checkToken(@Headers('authorization') authHeader: string, @Request() req) {
    try {
      const token = authHeader.replace('Bearer ', '');
      const tokenInfo = await this.authService.checkTokenExpiration(token);
      
      return {
        code: 1,
        status: true,
        message: 'Token is valid',
        data: {
          isValid: true,
          isExpiring: tokenInfo.isExpiring,
          expiresAt: tokenInfo.expiresAt,
          minutesLeft: tokenInfo.minutesLeft,
          user: req.user,
        },
      };
    } catch (error) {
      throw new HttpException({
        code: 0,
        status: false,
        message: 'Token is invalid',
        error: 'TOKEN_INVALID',
      }, HttpStatus.UNAUTHORIZED);
    }
  }

  // เพิ่ม endpoint สำหรับ logout
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout() {
    return {
      code: 1,
      status: true,
      message: 'Logout successful. Please remove token from client storage.',
    };
  }

  // เพิ่ม endpoint สำหรับ validate token
  @Post('validate')
  async validateToken(@Body('token') token: string) {
    try {
      const user = await this.authService.validateToken(token);
      return {
        code: 1,
        status: true,
        message: 'Token is valid',
        user,
      };
    } catch (error) {
      throw new HttpException({
        code: 0,
        status: false,
        message: error.message,
        error: error.error || 'TOKEN_INVALID',
      }, HttpStatus.UNAUTHORIZED);
    }
  }
}