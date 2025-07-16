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
import { TicketStatusHistoryModule } from 'src/ticket_status_history/ticket_status_history.module';
import { TicketStatusService } from 'src/ticket_status/ticket_status.service';
import { TicketStatusModule } from 'src/ticket_status/ticket_status.module';
import { Satisfaction } from 'src/satisfaction/entities/satisfaction.entity';
import { Users } from 'src/users/entities/user.entity';
import { NotificationModule } from 'src/notification/notification.module';
import { TicketAssigned } from 'src/ticket_assigned/entities/ticket_assigned.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Ticket,
      Users,
      Satisfaction,
      TicketAttachment,
      TicketStatusHistory,
      TicketCategory,
      Project,
      TicketStatus,
      TicketAssigned,
    ]),
    TicketStatusHistoryModule,
    TicketStatusModule,
    NotificationModule,
  ],
  controllers: [TicketController, TicketAttachmentController],
  providers: [
    TicketService,
    AttachmentService,
  ],
  exports: [
    TicketService,
  ]
})
export class TicketModule {}
