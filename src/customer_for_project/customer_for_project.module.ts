import { Module } from '@nestjs/common';
import { CustomerForProjectService } from './customer_for_project.service';
import { CustomerForProjectController } from './customer_for_project.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerForProject } from './entities/customer-for-project.entity';
import { Project } from 'src/project/entities/project.entity';
import { Customer } from 'src/customer/entities/customer.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CustomerForProject, Project, Customer])
  ],
  controllers: [CustomerForProjectController],
  providers: [CustomerForProjectService],
})
export class CustomerForProjectModule {}
