import { Module } from '@nestjs/common';
import { TicketStatusService } from './ticket_status.service';
import { TicketStatusController } from './ticket_status.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketStatus } from './entities/ticket_status.entity';
import { TicketStatusLanguage } from 'src/ticket_status_language/entities/ticket_status_language.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([TicketStatus, TicketStatusLanguage]),
  ],
  controllers: [TicketStatusController],
  providers: [TicketStatusService],
  exports: [TicketStatusService, TypeOrmModule],
})
export class TicketStatusModule {}
