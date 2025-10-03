import { Controller, Post, Res, Body, UseGuards } from '@nestjs/common';
import { ExportExcelService } from './export-excel.service';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt_auth.guard';

@Controller('api')
export class ExportExcelController {
  constructor(private readonly exportExcelService: ExportExcelService) {}

  @UseGuards(JwtAuthGuard)
  @Post('export-excel')
  async exportTickets(@Res() res: Response, @Body() filter: any) {
    return this.exportExcelService.exportTickets(res, filter);
  }
}
