import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MasterRoleService } from './master_role.service';
import { CreateMasterRoleDto } from './dto/create-master_role.dto';
import { UpdateMasterRoleDto } from './dto/update-master_role.dto';

@Controller()
export class MasterRoleController {
  constructor(private readonly masterRoleService: MasterRoleService) {}

  @Post('masterRole')
  create(@Body() createMasterRoleDto: CreateMasterRoleDto) {
    return this.masterRoleService.create(createMasterRoleDto);
  }

  @Get()
  findAll() {
    return this.masterRoleService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.masterRoleService.findOne(id);
  }

  @Get('name/:name')
  findByName(@Param('name') name: string) {
    return this.masterRoleService.findByName(name);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMasterRoleDto: UpdateMasterRoleDto,
  ) {
    return this.masterRoleService.update(id, updateMasterRoleDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.masterRoleService.remove(id);
  }
}
