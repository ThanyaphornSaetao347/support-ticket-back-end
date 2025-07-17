// customer/customer.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { JwtAuthGuard } from '../auth/jwt_auth.guard';

@Controller('api/customer')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createCustomerDto: CreateCustomerDto, @Request() req) {
    console.log('User in request:', req.user);
    const userId = req.user.id || req.user.sub || req.user.userId;

    // add user_id in dto
    createCustomerDto.create_by = userId;
    createCustomerDto.update_by = userId;

    return this.customerService.create(createCustomerDto, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.customerService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-customers')
  findMyCustomers(@Request() req) {
    return this.customerService.findCustomersByUserId(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customerService.findOne(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCustomerDto: UpdateCustomerDto, @Request() req) {
    console.log('User in request:', req.user);
    const userId = req.user.id || req.user.sub || req.user.userId;

    // add user_id in dto
    updateCustomerDto.create_by = userId;
    updateCustomerDto.update_by = userId;

    return this.customerService.update(+id, updateCustomerDto, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.customerService.remove(+id);
  }
}
