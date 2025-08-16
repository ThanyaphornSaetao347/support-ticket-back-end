import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { data } from 'jquery';
import { JwtAuthGuard } from 'src/auth/jwt_auth.guard';
import { PermissionGuard } from './permission.guard';

@Controller('permission')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Get('permission')
  async getAllPermissions() {
    const roles = await this.permissionService.get_permission_all();
    return {
      status: 'success',
      data: roles,
    };
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Get('my-roles')
  async getMyRoles(@Req() req) {
    const userId = req.user.id; // ดึง user_id จาก JWT
    const roles = await this.permissionService.get_permission_byOne(userId);
    return {
      status: 'success',
      data: roles,
    };
  }

  @Post()
  create(@Body() createPermissionDto: CreatePermissionDto) {
    return this.permissionService.create(createPermissionDto);
  }

  @Get()
  findAll() {
    return this.permissionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.permissionService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePermissionDto: UpdatePermissionDto) {
    return this.permissionService.update(+id, updatePermissionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.permissionService.remove(+id);
  }
}
