import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Users } from 'src/users/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

interface AuthResponse {
  code: number;
  status: boolean;
  message: string;
  user: {
    id: number;
    username: string;
  } | null;
  access_token: string | null;
  expires_in?: string;
  expires_at?: string; // เพิ่มเพื่อให้ frontend รู้ว่าหมดอายุเมื่อไหร่
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Users)
    private userRepo: Repository<Users>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: { username: string; password: string }) {
    const existingUser = await this.userRepo.findOne({ where: { username: dto.username } });
    if (existingUser) {
      throw new UnauthorizedException('Username already exists');
    }
      // เข้ารหัสรหัสผ่าน
    const hashed = await bcrypt.hash(dto.password, 10);
      // สร้างผู้ใช้ใหม่
    const newuser = this.userRepo.create({ 
      username: dto.username, 
      password: hashed 
    });

    await this.userRepo.save(newuser);

    return {
      code: 1,
      status: true,
      message: 'User registered successfully',
    };
  }

  async validateUser(username: string, password: string): Promise<any> {
    console.log('Attempting to validate user:', username);

    // ค้นหาผู้ใช้ด้วยชื่อผู้ใช้ที่ตรงกันเท่านั้น และทำให้มั่นใจว่าเป็นการค้นหาที่แม่นยำ
    const user = await this.userRepo.findOne({ 
      where: { username: username },
      select: ['id', 'username', 'password'] // ระบุคอลัมน์ที่ต้องการ
    });

    // ตรวจสอบว่าพบผู้ใช้หรือไม่
    if (!user) {
      console.log('User not found:', username);
      return null;
    }

    console.log('Found user ID:', user.id, 'Username:', user.username);

    // ตรวจสอบรหัสผ่าน
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('Password validation result:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('Invalid password for user:', username);
      return null;
    }

    // สร้างออบเจ็กต์ผลลัพธ์ที่ไม่มีรหัสผ่าน
    const { password: _, ...result } = user;
    console.log('Validation successful, returning user:', result);

    return result;
  }

  async login(user: any): Promise<AuthResponse> {
    console.log('Login processing for user:', user.username, 'ID:', user.id);
    
    if (!user || !user.id || !user.username) {
      console.error('Invalid user object in login:', user);
      return {
        code: 0,
        status: false,
        message: 'Invalid user data',
        user: null,
        access_token: null
      };
    }
    
    // สร้าง JWT payload แบบธรรมดา (ลบ iat และ exp ออก)
    const payload = { 
      username: user.username, 
      sub: user.id,
    };

    console.log('JWT payload:', payload);
    
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN') || '3h';
    console.log('Token will expire in:', expiresIn);
    
    // สร้าง token โดยให้ JwtModule จัดการ expiration
    const token = this.jwtService.sign(payload);
    
    console.log('Generated token for user:', user.username);
    
    // คำนวณ expires_at สำหรับ frontend
    const expiresInSeconds = this.parseExpiresIn(expiresIn);
    const now = Math.floor(Date.now() / 1000);
    
    return {
      code: 1,
      status: true,
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
      },
      access_token: token,
      expires_in: expiresIn,
      expires_at: new Date((now + expiresInSeconds) * 1000).toISOString(),
    };
  }

  // Helper method สำหรับแปลง expires_in เป็น seconds
  private parseExpiresIn(expiresIn: string): number {
    const unit = expiresIn.slice(-1);
    const value = parseInt(expiresIn.slice(0, -1));
    
    switch (unit) {
      case 'h':
        return value * 60 * 60; // hours to seconds
      case 'm':
        return value * 60; // minutes to seconds
      case 's':
        return value; // seconds
      case 'd':
        return value * 24 * 60 * 60; // days to seconds
      default:
        return 3 * 60 * 60; // default 3 hours
    }
  }

  // เพิ่ม method สำหรับตรวจสอบ token
  async validateToken(token: string) {
    try {
      const decoded = this.jwtService.verify(token);
      const user = await this.userRepo.findOne({ 
        where: { id: decoded.sub },
        select: ['id', 'username']
      });
      
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return user;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException({
          message: 'Token expired',
          error: 'TOKEN_EXPIRED',
          statusCode: 401,
        });
      }
      throw new UnauthorizedException('Invalid token');
    }
  }

  // เพิ่ม method สำหรับตรวจสอบว่า token ใกล้หมดอายุหรือไม่
  async checkTokenExpiration(token: string): Promise<{ isExpiring: boolean; expiresAt: Date; minutesLeft: number }> {
    try {
      const decoded = this.jwtService.decode(token) as any;
      const expiresAt = new Date(decoded.exp * 1000);
      const now = new Date();
      const timeDiff = expiresAt.getTime() - now.getTime();
      const minutesLeft = Math.floor(timeDiff / (1000 * 60));
      
      return {
        isExpiring: minutesLeft <= 15, // เตือนเมื่อเหลือ 15 นาที
        expiresAt,
        minutesLeft,
      };
    } catch (error) {
      return {
        isExpiring: true,
        expiresAt: new Date(),
        minutesLeft: 0,
      };
    }
  }
}