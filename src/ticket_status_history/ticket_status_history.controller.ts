import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TicketStatusHistoryService } from './ticket_status_history.service';
import { CreateTicketStatusHistoryDto } from './dto/create-ticket_status_history.dto';
import { UpdateTicketStatusHistoryDto } from './dto/update-ticket_status_history.dto';

@Controller('ticket-status-history')
export class TicketStatusHistoryController {
  constructor(private readonly ticketStatusHistoryService: TicketStatusHistoryService) {}

  @Post()
  create(@Body() createTicketStatusHistoryDto: CreateTicketStatusHistoryDto) {
    return this.ticketStatusHistoryService.create(createTicketStatusHistoryDto);
  }

  @Get()
  findAll() {
    return this.ticketStatusHistoryService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ticketStatusHistoryService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTicketStatusHistoryDto: UpdateTicketStatusHistoryDto) {
    return this.ticketStatusHistoryService.update(+id, updateTicketStatusHistoryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ticketStatusHistoryService.remove(+id);
  }
}
