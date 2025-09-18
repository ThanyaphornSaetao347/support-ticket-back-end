import { Test, TestingModule } from '@nestjs/testing';
import { UserAllowRoleService } from './user_allow_role.service';

describe('UserAllowRoleService', () => {
  let service: UserAllowRoleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserAllowRoleService],
    }).compile();

    service = module.get<UserAllowRoleService>(UserAllowRoleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
