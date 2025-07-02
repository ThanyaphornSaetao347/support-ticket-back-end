import { Module } from '@nestjs/common';
import { UserAllowRoleService } from './user_allow_role.service';
import { UserAllowRoleController } from './user_allow_role.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAllowRole } from './entities/user_allow_role.entity';
import { MasterRoleModule } from 'src/master_role/master_role.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserAllowRole
    ]),
    MasterRoleModule
  ],
  controllers: [UserAllowRoleController],
  providers: [UserAllowRoleService],
  exports: [TypeOrmModule]
})
export class UserAllowRoleModule {}
