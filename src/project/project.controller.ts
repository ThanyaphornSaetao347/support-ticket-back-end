import { Controller, Post, Get, UseGuards, Request, Param, ParseIntPipe, Body } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt_auth.guard';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';

@Controller('api')
export class ProjectController {
  constructor(private projectService: ProjectService) {}

  @UseGuards(JwtAuthGuard)
  @Post('getProjectDDL')
  async getProjectDDL(@Request() req) {
    console.log('User in request:', req.user);
    const userId = req.user.id || req.user.sub || req.user.userId;
    const result = await this.projectService.getProjectsForUser(userId);

    return {
      code: result.code,
      status: result.status,
      message: result.message,
      data: result.data
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('projects')
  async createProject(@Body() createProjectDto: CreateProjectDto, @Request() req) {
    console.log('User in request:', req.user);
    const userId = req.user.id || req.user.sub || req.user.userId

    // add user_id in dto
    createProjectDto.create_by = userId;

    return this.projectService.createProject(createProjectDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('projects')
  async getProjects(@Request() req) {
    console.log('User in request:', req.user);
    const userId = req.user.id || req.user.sub || req.user.userId;
    return this.projectService.getProjectsForUser(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('projects/all')
  async getAllProjects() {
    return this.projectService.getAllProjects();
  }

  @UseGuards(JwtAuthGuard)
  @Get('projects/:id')
  async getProjectById(@Param('id', ParseIntPipe) id: number) {
    return this.projectService.getProjectById(id);
  }
}
