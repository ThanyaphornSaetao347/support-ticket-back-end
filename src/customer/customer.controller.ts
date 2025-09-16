// customer/customer.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { JwtAuthGuard } from '../auth/jwt_auth.guard';
import { PermissionGuard } from '../permission/permission.guard';
<<<<<<< HEAD
import { RequireAnyAction } from '../permission/permission.decorator';
=======
import { RequireAnyAction } from 'src/permission/permission.decorator';
>>>>>>> fef258e11fb85526f63cfa733c58125e62453040

@Controller('api')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) { }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyAction('manage_customer')
  @Post('customer')
  create(@Body() createCustomerDto: CreateCustomerDto, @Request() req) {
    console.log('User in request:', req.user);

    const userId = req.user?.id || req.user?.sub || req.user?.userId;

    // add user_id in dto
    createCustomerDto.create_by = userId;
    createCustomerDto.update_by = userId;

    return this.customerService.create(createCustomerDto, userId);
<<<<<<< HEAD
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyAction('manage_customer')
  @Get('get_customer_data')
  async getCustomerData() {
    return this.customerService.getCustomer()
=======
>>>>>>> 44b5f76e0a11799c862a981775c1a3a71ac974a4
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyAction('manage_customer')
  @Get('get_customer_data')
  async getCustomerData() {
    return this.customerService.getCustomer()
  }

  @UseGuards(JwtAuthGuard)
  @Get('get_all_customer')
  findAll() {
    return this.customerService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-customers')
  findMyCustomers(@Request() req) {
    if (!req || !req.user) {
      throw new Error('Unauthorized: no user in request');
    }
    const userId = req.user.id || req.user.sub || req.user.userId;
    return this.customerService.findCustomersByUserId(userId);
  }

<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> fef258e11fb85526f63cfa733c58125e62453040
  // ใน customer.controller.ts
  @Get('getOne/:id')
  findOne(@Param('id') rawId: string) {
    console.log('Customer Controller received ID:', rawId);
<<<<<<< HEAD
=======

    const id = parseInt(rawId, 10);

    if (isNaN(id)) {
      throw new BadRequestException(`Customer ID must be a valid number, received: "${rawId}"`);
    }

    return this.customerService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('update/:id')
=======
>>>>>>> fef258e11fb85526f63cfa733c58125e62453040

    const id = parseInt(rawId, 10);

    if (isNaN(id)) {
      throw new BadRequestException(`Customer ID must be a valid number, received: "${rawId}"`);
    }

    return this.customerService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
<<<<<<< HEAD
  @Patch('update/:id')
=======
  @Patch(':id')
>>>>>>> 44b5f76e0a11799c862a981775c1a3a71ac974a4
>>>>>>> fef258e11fb85526f63cfa733c58125e62453040
  update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @Request() req,
  ) {
    console.log('User in request:', req.user);

    const userId = req.user?.id || req.user?.sub || req.user?.userId;

    // add user_id in dto
    updateCustomerDto.create_by = userId;
    updateCustomerDto.update_by = userId;

    return this.customerService.update(+id, updateCustomerDto, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('delete/:id')
  remove(@Param('id') id: string) {
    return this.customerService.remove(+id);
  }
}
