import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UserRole, UserStatus } from '../generated/prisma/enums';
import { ModerationService } from './moderation.service';

describe('ModerationService administrator role protection', () => {
  const target = {
    id: 'target-admin',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
  };

  function createService() {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(target),
      },
      $transaction: jest.fn(),
    } as unknown as PrismaService;
    return { service: new ModerationService(prisma), prisma };
  }

  it('prevents an administrator from managing another administrator', async () => {
    const { service } = createService();

    await expect(
      service.updateManagedUser(target.id, 'another-admin', UserRole.ADMIN, {
        role: UserRole.USER,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('prevents a moderator from changing an administrator role', async () => {
    const { service } = createService();

    await expect(
      service.updateManagedUser(target.id, 'moderator', UserRole.MODERATOR, {
        role: UserRole.USER,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
