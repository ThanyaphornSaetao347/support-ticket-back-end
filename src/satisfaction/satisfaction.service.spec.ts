import { Test, TestingModule } from '@nestjs/testing';
import { SatisfactionService } from './satisfaction.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Satisfaction } from './entities/satisfaction.entity';
import { Ticket } from '../ticket/entities/ticket.entity';
import { Repository } from 'typeorm';
import { CreateSatisfactionDto } from './dto/create-satisfaction.dto';
import { NotFoundException } from '@nestjs/common';

describe('SatisfactionService', () => {
  let service: SatisfactionService;
  let satisfactionRepository: jest.Mocked<Repository<Satisfaction>>;
  let ticketRepository: jest.Mocked<Repository<Ticket>>;

  const mockSatisfaction = {
    id: 1,
    ticket_id: 1,
    rating: 5,
    create_by: 1,
    create_date: new Date(),
    ticket: { id: 1, ticket_no: 'T12345' },
  };

  const createMockRepository = () => ({
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SatisfactionService,
        {
          provide: getRepositoryToken(Satisfaction),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(Ticket),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<SatisfactionService>(SatisfactionService);
    satisfactionRepository = module.get(getRepositoryToken(Satisfaction));
    ticketRepository = module.get(getRepositoryToken(Ticket));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new satisfaction rating successfully', async () => {
      const createDto = { rating: 5 };
      const ticketId = 1;
      const createBy = 1;

      const mockTicket = { id: ticketId, ticket_no: 'T12345' };
      ticketRepository.findOne.mockResolvedValueOnce(mockTicket as any);
      satisfactionRepository.create.mockReturnValueOnce(mockSatisfaction as any);
      satisfactionRepository.save.mockResolvedValueOnce(mockSatisfaction as any);

      const result = await service.create(ticketId, createBy, createDto);

      expect(ticketRepository.findOne).toHaveBeenCalledWith({ where: { id: ticketId } });
      expect(satisfactionRepository.create).toHaveBeenCalledWith({
        ...createDto,
        ticket_id: ticketId,
        create_by: createBy,
      });
      expect(satisfactionRepository.save).toHaveBeenCalledWith(mockSatisfaction);
      expect(result).toEqual(mockSatisfaction);
    });

    it('should throw NotFoundException if ticket does not exist', async () => {
      const createDto = { rating: 5 };
      const ticketId = 999;
      const createBy = 1;

      ticketRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.create(ticketId, createBy, createDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return an array of satisfactions', async () => {
      const satisfactions = [mockSatisfaction, { ...mockSatisfaction, id: 2 }];
      satisfactionRepository.find.mockResolvedValueOnce(satisfactions as any);

      const result = await service.findAll();

      expect(satisfactionRepository.find).toHaveBeenCalledWith({ relations: ['ticket'] });
      expect(result).toEqual(satisfactions);
    });
  });

  describe('findOne', () => {
    it('should return a single satisfaction by id', async () => {
      satisfactionRepository.findOne.mockResolvedValueOnce(mockSatisfaction as any);

      const result = await service.findOne(1);

      expect(satisfactionRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['ticket'],
      });
      expect(result).toEqual(mockSatisfaction);
    });

    it('should throw NotFoundException if satisfaction not found', async () => {
      satisfactionRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a satisfaction rating successfully', async () => {
      const updateDto = { rating: 4 };
      satisfactionRepository.findOne.mockResolvedValueOnce(mockSatisfaction as any);
      satisfactionRepository.save.mockResolvedValueOnce({ ...mockSatisfaction, ...updateDto } as any);

      const result = await service.update(1, updateDto);

      expect(satisfactionRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 }, relations: ['ticket'] });
      expect(satisfactionRepository.save).toHaveBeenCalledWith({ ...mockSatisfaction, ...updateDto });
      expect(result).toEqual({ ...mockSatisfaction, ...updateDto });
    });

    it('should throw NotFoundException if satisfaction not found', async () => {
      const updateDto = { rating: 4 };
      satisfactionRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.update(999, updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a satisfaction rating successfully', async () => {
      satisfactionRepository.findOne.mockResolvedValueOnce(mockSatisfaction as any);
      // ✅ Corrected: The remove method returns the removed entity.
      satisfactionRepository.remove.mockResolvedValueOnce(mockSatisfaction as any);

      const result = await service.remove(1);

      expect(satisfactionRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 }, relations: ['ticket'] });
      expect(satisfactionRepository.remove).toHaveBeenCalledWith(mockSatisfaction);
      expect(result).toEqual({ deleted: true });
    });

    it('should throw NotFoundException if satisfaction not found', async () => {
      satisfactionRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});