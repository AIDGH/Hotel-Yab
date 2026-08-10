import { Request } from 'express';
import { UserRole } from '../generated/prisma/enums';

export type AuthenticatedUser = {
  id: string;
  role: UserRole;
};

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
  sessionToken: string;
};
