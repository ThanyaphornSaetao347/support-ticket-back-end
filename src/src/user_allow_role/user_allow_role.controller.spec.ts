import { Test, TestingModule } from '@nestjs/testing';
import { UserAllowRoleController } from './user_allow_role.controller';
import { UserAllowRoleService } from './user_allow_role.service';

describe('UserAllowRoleController', () => {
  let controller: UserAllowRoleController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserAllowRoleController],
      providers: [UserAllowRoleService],
    }).compile();

    controller = module.get<UserAllowRoleController>(UserAllowRoleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
