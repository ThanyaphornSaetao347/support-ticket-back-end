import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Users } from '../users/entities/user.entity';
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
  refresh_token?: string | null; // เพิ่ม refresh token
  expires_in?: string;
  expires_at?: string;
  token_expires_timestamp?: number;
  refresh_expires_in?: string; // เพิ่มข้อมูล refresh token expiry
  refresh_expires_at?: string;
  permission?: number[];
}

interface RefreshTokenResponse {
  code: number;
  status: boolean;
  message: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_in?: string;
  expires_at?: string;
  token_expires_timestamp?: number;
  refresh_expires_in?: string;
  refresh_expires_at?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Users)
    private userRepo: Repository<Users>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) { }

  async register(dto: { username: string; password: string }) {
    const existingUser = await this.userRepo.findOne({ where: { username: dto.username } });
    if (existingUser) {
      throw new UnauthorizedException('Username already exists');
    }
    
    const hashed = await bcrypt.hash(dto.password, 10);
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

    const user = await this.userRepo.findOne({
      where: { username: username },
      select: ['id', 'username', 'password']
    });

    if (!user) {
      console.log('User not found:', username);
      return null;
    }

    console.log('Found user ID:', user.id, 'Username:', user.username);

    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('Password validation result:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('Invalid password for user:', username);
      return null;
    }

    const { password: _, ...result } = user;
    console.log('Validation successful, returning user:', result);

    return result;
  }

  async login(user: any): Promise<AuthResponse> {
    if (!user) {
      console.log('Login failed: user is null or undefined');
      return {
        code: 0,
        status: false,
        message: 'Invalid user data',
        user: null,
        access_token: null
      };
    }

    console.log('Login processing for user:', user.username, 'ID:', user.id);
    
    if (!user.id || !user.username) {
      console.error('Invalid user object in login:', user);
      return {
        code: 0,
        status: false,
        message: 'Invalid user data',
        user: null,
        access_token: null
      };
    }
    
    // สร้าง JWT payload สำหรับ access token
    const accessPayload = { 
      username: user.username, 
      sub: user.id,
      type: 'access' // ระบุประเภท token
    };

    // สร้าง JWT payload สำหรับ refresh token
    const refreshPayload = {
      sub: user.id,
      type: 'refresh' // ระบุประเภท token
    };

    console.log('JWT access payload:', accessPayload);
    console.log('JWT refresh payload:', refreshPayload);
    
    const accessExpiresIn = this.configService.get<string>('JWT_EXPIRES_IN') || '15m';
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '1d';
    
    console.log('Access token will expire in:', accessExpiresIn);
    console.log('Refresh token will expire in:', refreshExpiresIn);
    
    // สร้าง access token
    const accessToken = this.jwtService.sign(accessPayload, {
      expiresIn: accessExpiresIn
    });
    
    // สร้าง refresh token
    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: refreshExpiresIn
    });
    
    console.log('Generated tokens for user:', user.username);
    
    // คำนวณ expires_at สำหรับ access token
    const accessExpiresInSeconds = this.parseExpiresIn(accessExpiresIn);
    const refreshExpiresInSeconds = this.parseExpiresIn(refreshExpiresIn);
    const now = Math.floor(Date.now() / 1000);
    const accessExpiresTimestamp = now + accessExpiresInSeconds;
    const refreshExpiresTimestamp = now + refreshExpiresInSeconds;
    
    // ดึง permissions ของ user
    const permissions = await this.getUserPermissions(user.id);
    
    return {
      code: 1,
      status: true,
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
      },
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: accessExpiresIn,
      expires_at: new Date(accessExpiresTimestamp * 1000).toISOString(),
      token_expires_timestamp: accessExpiresTimestamp,
      refresh_expires_in: refreshExpiresIn,
      refresh_expires_at: new Date(refreshExpiresTimestamp * 1000).toISOString(),
      permission: permissions,
    };
  }

  // เพิ่ม method สำหรับ refresh token
  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    try {
      // ตรวจสอบ refresh token
      const decoded = this.jwtService.verify(refreshToken);
      
      // ตรวจสอบว่าเป็น refresh token จริง
      if (decoded.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      // ดึงข้อมูล user จากฐานข้อมูล
      const user = await this.userRepo.findOne({
        where: { id: decoded.sub },
        select: ['id', 'username']
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // สร้าง access token ใหม่
      const accessPayload = {
        username: user.username,
        sub: user.id,
        type: 'access'
      };

      // สร้าง refresh token ใหม่
      const refreshPayload = {
        sub: user.id,
        type: 'refresh'
      };

      const accessExpiresIn = this.configService.get<string>('JWT_EXPIRES_IN') || '15m';
      const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '1d';

      const newAccessToken = this.jwtService.sign(accessPayload, {
        expiresIn: accessExpiresIn
      });

      const newRefreshToken = this.jwtService.sign(refreshPayload, {
        expiresIn: refreshExpiresIn
      });

      // คำนวณ expires_at
      const accessExpiresInSeconds = this.parseExpiresIn(accessExpiresIn);
      const refreshExpiresInSeconds = this.parseExpiresIn(refreshExpiresIn);
      const now = Math.floor(Date.now() / 1000);
      const accessExpiresTimestamp = now + accessExpiresInSeconds;
      const refreshExpiresTimestamp = now + refreshExpiresInSeconds;

      console.log('Token refreshed successfully for user:', user.username);

      return {
        code: 1,
        status: true,
        message: 'Token refreshed successfully',
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        expires_in: accessExpiresIn,
        expires_at: new Date(accessExpiresTimestamp * 1000).toISOString(),
        token_expires_timestamp: accessExpiresTimestamp,
        refresh_expires_in: refreshExpiresIn,
        refresh_expires_at: new Date(refreshExpiresTimestamp * 1000).toISOString(),
      };

    } catch (error) {
      console.error('Refresh token error:', error);
      
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException({
          message: 'Refresh token expired. Please login again.',
          error: 'REFRESH_TOKEN_EXPIRED',
          statusCode: 401,
        });
      }
      
      throw new UnauthorizedException({
        message: 'Invalid refresh token',
        error: 'INVALID_REFRESH_TOKEN',
        statusCode: 401,
      });
    }
  }

  async getUserPermissions(userId: number): Promise<number[]> {
    try {
      const userRoles = await this.userRepo.query(`
        SELECT role_id 
        FROM users_allow_role 
        WHERE user_id = $1
      `, [userId]);

      if (!userRoles || userRoles.length === 0) {
        console.log(`No roles found for user ${userId}`);
        return [];
      }

      const roleIds = userRoles.map(r => r.role_id);
      console.log(`User ${userId} has roles:`, roleIds);

      return roleIds;

    } catch (error) {
      console.error('Error getting user permissions:', error);
      return [];
    }
  }

  private parseExpiresIn(expiresIn: string): number {
    const unit = expiresIn.slice(-1);
    const value = parseInt(expiresIn.slice(0, -1));

    switch (unit) {
      case 'h':
        return value * 60 * 60;
      case 'm':
        return value * 60;
      case 's':
        return value;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 15 * 60; // default 15 minutes (แก้จาก 3 ชั่วโมง)
    }
  }

  async validateToken(token: string) {
    try {
      const decoded = this.jwtService.verify(token);
      
      // ตรวจสอบว่าเป็น access token
      if (decoded.type && decoded.type !== 'access') {
        throw new UnauthorizedException('Invalid token type');
      }
      
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

  async checkTokenExpiration(token: string): Promise<{
    isExpiring: boolean;
    expiresAt: Date;
    minutesLeft: number;
    shouldRefresh: boolean;
  }> {
    try {
      const decoded = this.jwtService.decode(token) as any;
      const expiresAt = new Date(decoded.exp * 1000);
      const now = new Date();
      const timeDiff = expiresAt.getTime() - now.getTime();
      const minutesLeft = Math.floor(timeDiff / (1000 * 60));

      return {
        isExpiring: minutesLeft <= 15,
        expiresAt,
        minutesLeft,
        shouldRefresh: minutesLeft <= 5,
      };
    } catch (error) {
      return {
        isExpiring: true,
        expiresAt: new Date(),
        minutesLeft: 0,
        shouldRefresh: true,
      };
    }
  }
}