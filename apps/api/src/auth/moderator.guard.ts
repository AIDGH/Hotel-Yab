import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserRole } from '../generated/prisma/enums';
import type { AuthenticatedRequest } from './auth.types';

@Injectable()
export class ModeratorGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (
      request.user.role !== UserRole.MODERATOR &&
      request.user.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException('Moderator access is required');
    }
    return true;
  }
}
