// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Serve static files
  // app.use('/uploads/issue_attachment', express.static(join(__dirname, '..', 'uploads/issue_attachment')));

  
  // ตั้งค่า CORS สำหรับใช้ JWT Token
  app.enableCors({
    origin: [
      'http://192.168.1.114:4200',
      'http://localhost:4200',        // Angular dev server
    ],
    credentials: false,               // เปลี่ยนเป็น false เพราะไม่ใช้ cookie
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers',
      'language',                   // Custom header ของคุณ
      'user-id',                   // Custom header ของคุณ
      'api-key'                    // Custom header ของคุณ
    ],
  });

  // ตั้งค่า ValidationPipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      forbidNonWhitelisted: false,
      disableErrorMessages: false,
    }),
  );

  // อ่านค่า PORT จาก .env หรือใช้ค่าเริ่มต้น 3000
  const port = process.env.PORT || 3000;

  // ใช้ HttpExceptionFilter ทั่วทั้งแอปพลิเคชัน
  app.useGlobalFilters(new HttpExceptionFilter());
  
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Application is running on: http://0.0.0.0:${port}`);
  console.log(`🌍 External access: http://[your-ip]:${port}`);
  console.log(`🔑 Using JWT Token authentication (no cookies)`);
}
bootstrap();
