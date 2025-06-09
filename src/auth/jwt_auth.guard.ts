// src/auth/jwt-auth.guard.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// ใน auth.guard.ts หรือ jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any) {
    console.log('JwtAuthGuard.handlerequest called with:', { err, user, info});

    // สำหรับ development/testing
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      // สร้าง mock user เฉพาะในโหมด development
      console.log('Creating mock user for testing');
      return { id: 1, username: 'test_user' }; // mock user
    }

    // สำหรับ production
    if (err || !user) {
      console.log('JwtAuthGuard.handleRequest called');
      console.log('Error:', err);
      console.log('User:', user);
      console.log('Info:', info);
      const errorMessage = info instanceof Error ? info.message: 'No auth token';
      throw err || new UnauthorizedException(errorMessage);
    }
    return user;
  }
}