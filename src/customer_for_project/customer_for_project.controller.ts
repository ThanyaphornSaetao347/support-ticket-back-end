// customer_for_project/customer_for_project.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { CustomerForProjectService } from './customer_for_project.service';
import { CreateCustomerForProjectDto } from './dto/create-customer_for_project.dto';
import { UpdateCustomerForProjectDto } from './dto/update-customer_for_project.dto';
import { JwtAuthGuard } from '../auth/jwt_auth.guard';

@Controller('api/customer-for-project')
export class CustomerForProjectController {
  constructor(private readonly customerForProjectService: CustomerForProjectService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createCustomerForProjectDto: CreateCustomerForProjectDto, @Request() req) {
    const userId = req.user.id || req.user.sub || req.user.userId;
    // เพิ่ม user_id จาก token
    createCustomerForProjectDto.create_by = userId;
    createCustomerForProjectDto.update_by = userId

    return this.customerForProjectService.create(createCustomerForProjectDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.customerForProjectService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('project/:projectId/customers')
  getCustomersByProject(@Param('projectId') projectId: string) {
    return this.customerForProjectService.getCustomersByProject(+projectId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('customer/:customerId/projects')
  getProjectsByCustomer(@Param('customerId') customerId: string) {
    return this.customerForProjectService.getProjectsByCustomer(+customerId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customerForProjectService.findOne(+id);
  }

// customer_for_project/customer_for_project.controller.ts
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCustomerForProjectDto: UpdateCustomerForProjectDto, @Request() req) {
    const userId = req.user.id || req.user.sub || req.user.userId;
    // เพิ่ม user_id จาก token
    updateCustomerForProjectDto.create_by = userId;
    updateCustomerForProjectDto.update_by = userId;
    return this.customerForProjectService.update(+id, updateCustomerForProjectDto, req.user.userId);  // เพิ่ม req.user.userId เป็น argument ที่ 3
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.customerForProjectService.remove(+id);
  }

  // เพิ่ม endpoint นี้ใน CustomerForProjectController
  @UseGuards(JwtAuthGuard)
  @Patch(':id/change-user/:newUserId')
  changeUser(
    @Param('id') id: string,
    @Param('newUserId') newUserId: string,
    @Request() req
  ) {
    return this.customerForProjectService.changeUserAssignment(
      +id,
      +newUserId,
      req.user.userId
    );
  }
}
