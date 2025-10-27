import { Injectable } from '@nestjs/common';
import { CreateTicketPriorityDto } from './dto/create-ticket_priority.dto';
import { UpdateTicketPriorityDto } from './dto/update-ticket_priority.dto';

@Injectable()
export class TicketPriorityService {
  create(createTicketPriorityDto: CreateTicketPriorityDto) {
    return 'This action adds a new ticketPriority';
  }

  findAll() {
    return `This action returns all ticketPriority`;
  }

  findOne(id: number) {
    return `This action returns a #${id} ticketPriority`;
  }

  update(id: number, updateTicketPriorityDto: UpdateTicketPriorityDto) {
    return `This action updates a #${id} ticketPriority`;
  }

  remove(id: number) {
    return `This action removes a #${id} ticketPriority`;
  }
}
