import { Module } from '@nestjs/common';
import { TicketService } from './ticket.service';
import { TicketController } from './ticket.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from './entities/ticket.entity';
import { TicketAttachment } from 'src/ticket_attachment/entities/ticket_attachment.entity';
import { TicketStatusHistory } from 'src/ticket_status_history/entities/ticket_status_history.entity';
import { AttachmentService } from 'src/ticket_attachment/ticket_attachment.service';
import { TicketAttachmentController } from 'src/ticket_attachment/ticket_attachment.controller';
import { TicketCategory } from 'src/ticket_categories/entities/ticket_category.entity';
import { Project } from 'src/project/entities/project.entity';
import { TicketStatus } from 'src/ticket_status/entities/ticket_status.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Ticket, 
      TicketAttachment,
      TicketStatusHistory,
      TicketCategory,
      Project,
      TicketStatus
    ])
  ],
  controllers: [TicketController, TicketAttachmentController],
  providers: [
    TicketService,
    AttachmentService
  ],
  exports: [TicketService]
})
export class TicketModule {}
