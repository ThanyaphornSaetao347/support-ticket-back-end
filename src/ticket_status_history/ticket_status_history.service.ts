import { Injectable } from '@nestjs/common';
import { CreateTicketStatusHistoryDto } from './dto/create-ticket_status_history.dto';
import { UpdateTicketStatusHistoryDto } from './dto/update-ticket_status_history.dto';

@Injectable()
export class TicketStatusHistoryService {
  create(createTicketStatusHistoryDto: CreateTicketStatusHistoryDto) {
    return 'This action adds a new ticketStatusHistory';
  }

  findAll() {
    return `This action returns all ticketStatusHistory`;
  }

  findOne(id: number) {
    return `This action returns a #${id} ticketStatusHistory`;
  }

  update(id: number, updateTicketStatusHistoryDto: UpdateTicketStatusHistoryDto) {
    return `This action updates a #${id} ticketStatusHistory`;
  }

  remove(id: number) {
    return `This action removes a #${id} ticketStatusHistory`;
  }
}
