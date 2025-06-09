import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Users } from 'src/users/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { Response } from 'express';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Users)
    private userRepo: Repository<Users>,
    private jwtService: JwtService,
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

  async login(user: any) {
    console.log('Login processing for user:', user.username, 'ID:', user.id);
    
    // ตรวจสอบว่า user มีข้อมูลที่จำเป็นครบถ้วนหรือไม่
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
    
    // สร้าง payload สำหรับ JWT token
    const payload = { 
      username: user.username, 
      sub: user.id,
      // เพิ่มข้อมูลอื่นๆ ที่จำเป็น เช่น roles หรือ permissions (ถ้ามี)
    };

      // ตรวจสอบ payload
    console.log('JWT payload:', payload);
    
    // สร้าง token
    const token = this.jwtService.sign(payload, {
      // ระบุตัวเลือกเพิ่มเติมสำหรับ token เช่น อายุ
      expiresIn: '30m' // token หมดอายุใน 30 min
    });
    
    console.log('Generated token for user:', user.username);
    
    // ส่งผลลัพธ์กลับ
    return {
      code: 1,
      status: true,
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
      },
      access_token: token
    };
  }
}
