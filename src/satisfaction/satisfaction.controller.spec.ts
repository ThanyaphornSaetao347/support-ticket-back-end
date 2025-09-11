import { Test, TestingModule } from '@nestjs/testing';
import { SatisfactionController } from './satisfaction.controller';
import { SatisfactionService } from './satisfaction.service';
import { CreateSatisfactionDto } from './dto/create-satisfaction.dto';
import { UpdateSatisfactionDto } from './dto/update-satisfaction.dto';
import { JwtAuthGuard } from '../auth/jwt_auth.guard';
import { ParseIntPipe } from '@nestjs/common';

describe('SatisfactionController', () => {
  let controller: SatisfactionController;
  let service: SatisfactionService;

  const mockSatisfactionService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockUser = {
    id: 1,
    sub: 1,
    userId: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SatisfactionController],
      providers: [
        {
          provide: SatisfactionService,
          useValue: mockSatisfactionService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SatisfactionController>(SatisfactionController);
    service = module.get<SatisfactionService>(SatisfactionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call satisfactionService.create with the correct ID, user, and DTO', async () => {
      const ticketId = 1;
      const createDto: CreateSatisfactionDto = {
        rating: 5,
      };
      const req = { user: mockUser };
      await controller.create(ticketId, createDto, req);
      expect(service.create).toHaveBeenCalledWith(ticketId, mockUser.id, createDto);
    });
  });

  describe('findAll', () => {
    it('should call satisfactionService.findAll', async () => {
      await controller.findAll();
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should call satisfactionService.findOne with the parsed ID', async () => {
      const id = '1';
      await controller.findOne(id);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('update', () => {
    it('should call satisfactionService.update with the parsed ID and DTO', async () => {
      const id = '1';
      const updateDto: UpdateSatisfactionDto = { rating: 4 };
      await controller.update(id, updateDto);
      expect(service.update).toHaveBeenCalledWith(1, updateDto);
    });
  });

  describe('remove', () => {
    it('should call satisfactionService.remove with the parsed ID', async () => {
      const id = '1';
      await controller.remove(id);
      expect(service.remove).toHaveBeenCalledWith(1);
    });
  });
});