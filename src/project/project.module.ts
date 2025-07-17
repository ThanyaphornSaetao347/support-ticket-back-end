import { Module } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { CustomerForProject } from '../customer_for_project/entities/customer-for-project.entity';
import { Users } from '../users/entities/user.entity';
import { Customer } from '../customer/entities/customer.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project, 
      CustomerForProject,
      Users,
      Customer
    ])
  ],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule {}
