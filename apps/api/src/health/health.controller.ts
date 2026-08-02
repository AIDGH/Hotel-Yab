import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

type HealthResponse = {
  status: 'ok';
  database: 'up';
};

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getHealth(): Promise<HealthResponse> {
    await this.prisma.$queryRaw`SELECT 1`;

    return { status: 'ok', database: 'up' };
  }
}
