import { Module } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { PermissionController } from './permission.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAllowRole } from '../user_allow_role/entities/user_allow_role.entity';
import { MasterRole } from '../master_role/entities/master_role.entity';
import { PermissionGuard } from './permission.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserAllowRole,
      MasterRole,
    ])
  ],
  controllers: [PermissionController],
  providers: [PermissionService, PermissionGuard],
  exports: [PermissionService, PermissionGuard]
})
export class PermissionModule {}
