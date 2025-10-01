import { Module } from '@nestjs/common';
import { ExportExcelService } from './export-excel.service';
import { ExportExcelController } from './export-excel.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from '../ticket/entities/ticket.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Ticket
    ]),
  ],
  controllers: [ExportExcelController],
  providers: [ExportExcelService],
})
export class ExportExcelModule {}
