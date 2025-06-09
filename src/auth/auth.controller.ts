// src/auth/auth.controller.ts
import { Body, Controller, Post, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

// กำหนดชนิดข้อมูลสำหรับ response
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
    
    // ตรวจสอบและยืนยันตัวตนผู้ใช้
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

    // ดำเนินการล็อกอิน และกำหนดชนิดข้อมูลให้กับ result
    const result: LoginResponse = await this.authService.login(user);

    // ตรวจสอบข้อมูลก่อนส่งกลับ
    console.log('Login response:', result);
    
    // สร้าง object ใหม่ที่มีข้อมูลผู้ใช้ที่ถูกต้อง
    const correctedResponse: LoginResponse = {
      ...result,
      user: {
        id: user.id,
        username: user.username
      }
    };
    
    return correctedResponse;
  }
}