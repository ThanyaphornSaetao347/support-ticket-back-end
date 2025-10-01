import { Controller, Post, Res, Body } from '@nestjs/common';
import { ExportExcelService } from './export-excel.service';
import { Response } from 'express';

@Controller('api')
export class ExportExcelController {
  constructor(private readonly exportExcelService: ExportExcelService) {}

  @Post('export-excel')
  async exportTickets(@Res() res: Response, @Body() filter: any) {
    return this.exportExcelService.exportTickets(res, filter);
  }
}
