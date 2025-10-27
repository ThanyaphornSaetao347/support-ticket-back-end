import { Test, TestingModule } from '@nestjs/testing';
import { TicketPriorityService } from './ticket_priority.service';

describe('TicketPriorityService', () => {
  let service: TicketPriorityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TicketPriorityService],
    }).compile();

    service = module.get<TicketPriorityService>(TicketPriorityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
