import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthenticatedRequest } from './auth.types';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.authService.readSessionToken(request);

    if (!token) {
      throw new UnauthorizedException('Authentication is required');
    }

    const user = await this.authService.authenticateSession(token);
    request.user = user;
    request.sessionToken = token;
    return true;
  }
}
