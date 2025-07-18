import { Body, Controller, Post, Get, Param, Put, Delete, Query, UseGuards, Req } from '@nestjs/common';
import { UserService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { permissionEnum } from 'src/permission';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @UseGuards(AuthGuard('jwt')) // เพิ่ม JWT Guard สำหรับการสร้างผู้ใช้ใหม่
  async create(@Body() createUserDto: CreateUserDto, @Req() req: Request) {
    try {
      // ดึง user_id จาก JWT token
      const userId = req.user && req.user['id'] ? req.user['id'] : null;

      // check permission is admin?
      
      
      // เพิ่ม create_by และ update_by จาก user_id ที่ login
      createUserDto.create_by = userId;
      createUserDto.update_by = userId;
      
      console.log('Received DTO:', createUserDto);
      return await this.userService.create(createUserDto);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
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
