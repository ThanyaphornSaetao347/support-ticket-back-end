// src/auth/jwt.strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
  ) {
    // กำหนดค่าเริ่มต้นให้ secretOrKey เพื่อหลีกเลี่ยง undefined
    const jwtSecret = configService.get<string>('JWT_SECRET') || 'fallback_secret_key';
    
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret, // ใช้ตัวแปรที่เราตรวจสอบค่าแล้ว
    });
    
    console.log('JwtStrategy initialized with secret:', jwtSecret);
  }

  async validate(payload: any) {
    console.log('JwtStrategy.validate called with payload:', payload);
    
    if (!payload) {
      throw new UnauthorizedException('Invalid token payload');
    }
    
    // ส่งคืนข้อมูลผู้ใช้ที่มีทั้ง userId, id และ sub
    return { 
      id: payload.sub,           // หลักๆ ใช้ id
      userId: payload.sub,       // สำรอง
      user_id: payload.sub,      // สำรอง
      sub: payload.sub,          // สำรอง
      username: payload.username 
    };
  }
}