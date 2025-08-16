// src/user/user.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Users } from './entities/user.entity';
import { UserService } from './users.service';
import { UserController } from './users.controller';
import { UserAllowRole } from 'src/user_allow_role/entities/user_allow_role.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Users, UserAllowRole])],
  providers: [UserService],
  exports: [UserService],
  controllers: [UserController],
})
export class UserModule {}
