import { Module } from '@nestjs/common';
import { TicketStatusService } from './ticket_status.service';
import { TicketStatusController } from './ticket_status.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketStatus } from './entities/ticket_status.entity';
import { TicketStatusLanguage } from 'src/ticket_status_language/entities/ticket_status_language.entity';
import { Ticket } from 'src/ticket/entities/ticket.entity';
import { TicketStatusHistoryModule } from 'src/ticket_status_history/ticket_status_history.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TicketStatus, 
      TicketStatusLanguage, 
      Ticket
    ]),
    TicketStatusLanguage,
    TicketStatusHistoryModule
  ],
  controllers: [TicketStatusController],
  providers: [TicketStatusService],
  exports: [TicketStatusService, TypeOrmModule],
})
export class TicketStatusModule {}
