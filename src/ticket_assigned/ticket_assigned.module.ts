import { Module } from '@nestjs/common';
import { TicketAssignedService } from './ticket_assigned.service';
import { TicketAssignedController } from './ticket_assigned.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAllowRole } from 'src/user_allow_role/entities/user_allow_role.entity';
import { Ticket } from 'src/ticket/entities/ticket.entity';
import { TicketAssigned } from './entities/ticket_assigned.entity';
import { Users } from 'src/users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Ticket,
      TicketAssigned,
      Users,
      UserAllowRole
    ])
  ],
  controllers: [TicketAssignedController],
  providers: [TicketAssignedService],
})
export class TicketAssignedModule {}
