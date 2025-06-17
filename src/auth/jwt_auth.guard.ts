import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    console.log('JwtAuthGuard.handleRequest called with:', { err, user, info });

    // สำหรับ development/testing - ให้คงไว้ตามเดิม
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      console.log('Creating mock user for testing');
      return { id: 1, username: 'test_user' };
    }

    // ตรวจสอบ TOKEN EXPIRED - สำคัญมาก!
    if (info && info.name === 'TokenExpiredError') {
      console.log('Token has expired:', info.message);
      throw new UnauthorizedException({
        message: 'Token expired. Please login again.',
        statusCode: 401,
        error: 'TOKEN_EXPIRED',
        timestamp: new Date().toISOString(),
      });
    }

    // ตรวจสอบ Invalid Token
    if (info && info.name === 'JsonWebTokenError') {
      console.log('Invalid token format:', info.message);
      throw new UnauthorizedException({
        message: 'Invalid token format',
        statusCode: 401,
        error: 'INVALID_TOKEN',
      });
    }

    // ตรวจสอบ error อื่นๆ
    if (err || !user) {
      console.log('JwtAuthGuard Error:', err);
      console.log('User:', user);
      console.log('Info:', info);
      
      const errorMessage = info instanceof Error ? info.message : 'No auth token';
      throw err || new UnauthorizedException({
        message: errorMessage,
        statusCode: 401,
        error: 'UNAUTHORIZED',
      });
    }

    console.log('JWT validation successful for user:', user);
    return user;
  }
}