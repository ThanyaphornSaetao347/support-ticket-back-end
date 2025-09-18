// customer_for_project/customer_for_project.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, ParseIntPipe, BadRequestException } from '@nestjs/common';
import { CustomerForProjectService } from './customer_for_project.service';
import { CreateCustomerForProjectDto } from './dto/create-customer_for_project.dto';
import { UpdateCustomerForProjectDto } from './dto/update-customer_for_project.dto';
import { JwtAuthGuard } from '../auth/jwt_auth.guard';
<<<<<<< HEAD
import { PermissionGuard } from '../permission/permission.guard';
import { RequireAnyAction } from '../permission/permission.decorator';
=======
<<<<<<< HEAD
import { PermissionGuard } from '../permission/permission.guard';
import { RequireAnyAction } from '../permission/permission.decorator';
=======
import { PermissionGuard } from 'src/permission/permission.guard';
import { RequireAnyAction } from 'src/permission/permission.decorator';
>>>>>>> fef258e11fb85526f63cfa733c58125e62453040
>>>>>>> cea3524b1f3c03397e21b1d2703b94b86d58787a

@Controller('api/customer-for-project')
export class CustomerForProjectController {
  constructor(private readonly customerForProjectService: CustomerForProjectService) { }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyAction('manage_customer')
  @Post()
  create(@Body() createCustomerForProjectDto: CreateCustomerForProjectDto, @Request() req) {
    const userId = req.user.id || req.user.sub || req.user.userId;
    // เพิ่ม user_id จาก token
    createCustomerForProjectDto.create_by = userId;
    createCustomerForProjectDto.update_by = userId

    return this.customerForProjectService.create(createCustomerForProjectDto);
  }

<<<<<<< HEAD
  // customer_for_project/customer_for_project.controller.ts

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyAction('manage_customer')
  @Get('cfp-data')
  getCFPdata() {
    return this.customerForProjectService.getCFPdata();
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyAction('manage_customer')
  @Get('getAll')
=======
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyAction('manage_customer')
  @Get('get_data_customer_for_project')
>>>>>>> cea3524b1f3c03397e21b1d2703b94b86d58787a
  findAll() {
    return this.customerForProjectService.findAll();
  }

  @Get('project/:projectId/customers')
  getCustomersByProject(
    @Param('projectId', ParseIntPipe) projectId: number
  ) {
    return this.customerForProjectService.getCustomersByProject(projectId);
  }

  @Get('customer/:customerId/projects')
  getProjectsByCustomer(
    @Param('customerId', ParseIntPipe) customerId: number
  ) {
    return this.customerForProjectService.getProjectsByCustomer(customerId);
  }

  @Patch(':id/change-user/:newUserId')
  changeUser(
    @Param('id', ParseIntPipe) id: number,
    @Param('newUserId', ParseIntPipe) newUserId: number,
    @Request() req
  ) {
    return this.customerForProjectService.changeUserAssignment(id, newUserId, req.user.userId);
  }

  @Get('*')
  catchAll(@Param() params: any, @Request() req: any) {
    console.log('=== CAUGHT REQUEST ===');
    console.log('URL:', req.url);
    console.log('Params:', params);
    console.log('Route:', req.route?.path);
    console.log('Method:', req.method);
    return { error: 'Route not found', url: req.url };
  }

  @Get(':id')
  findOne(
    @Param('id', new ParseIntPipe({
      exceptionFactory: () => new BadRequestException('ID must be a valid number')
    })) id: number
  ) {
    return this.customerForProjectService.findOne(id);
  }

<<<<<<< HEAD
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyAction('manage_customer')
  @Patch('cfp/update/:id')
=======
  @Patch(':id')
>>>>>>> cea3524b1f3c03397e21b1d2703b94b86d58787a
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCustomerForProjectDto: UpdateCustomerForProjectDto,
    @Request() req
  ) {
    const userId = req.user.id || req.user.sub || req.user.userId;
    updateCustomerForProjectDto.create_by = userId;
    updateCustomerForProjectDto.update_by = userId;
    return this.customerForProjectService.update(id, updateCustomerForProjectDto, req.user.userId);
  }
<<<<<<< HEAD

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyAction('manage_customer')
  @Delete('cfp/delete/:id')
=======
  
  @Delete(':id')
>>>>>>> cea3524b1f3c03397e21b1d2703b94b86d58787a
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.customerForProjectService.remove(id);
  }
}