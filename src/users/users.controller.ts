import { Body, Controller, Post, Get, Param, Put, Delete, Query, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { UserService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { RequireRoles, RequireAction, RequireRolesOrOwner } from '../permission/permission.decorator';
import { JwtAuthGuard } from '../auth/jwt_auth.guard';
import { PermissionGuard } from '../permission/permission.guard';

@Controller('api/users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  private async canAddUser(userId: number): Promise<boolean> {
    if (!userId) return false;

    // ดึง role ของ user จากฐานข้อมูล (เช่น ผ่าน userService)
    const roles: number[] = await this.userService.getUserIdsByRole([15]);

    // สมมติ role 1 = Admin, role 2 = SuperAdmin สามารถเพิ่มผู้ใช้ได้
    return roles.some(r => roles.includes(r));
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAction('create_user')
  async create(@Body() createUserDto: CreateUserDto, @Req() req: Request) {
    const userId = req.user && req.user['id'] ? req.user['id'] : null;

    // เพิ่ม create_by และ update_by จาก user_id ที่ login
    createUserDto.create_by = userId;
    createUserDto.update_by = userId;

    console.log('Received DTO:', createUserDto);
    return await this.userService.create(createUserDto);
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAction('create_user')
  @Get('account')
  async getUserAccount() {
    return this.userService.userAccount();
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  findAll(@Query('username') username?: string, @Query('email') email?: string) {
    return this.userService.findAll({username, email});
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Req() req: Request) {

    const userId = req.user && req.user['id'] ? req.user['id'] : null;

    updateUserDto.update_by = userId;
    updateUserDto.create_by = userId;
    return this.userService.update(+id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }
}
