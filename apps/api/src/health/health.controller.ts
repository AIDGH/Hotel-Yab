import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../database/prisma.service';

type HealthResponse = {
  status: 'ok';
  database: 'up';
};

@Controller('health')
@ApiTags('Health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Check API and database readiness' })
  @ApiOkResponse({
    schema: {
      example: { status: 'ok', database: 'up' },
    },
  })
  async getHealth(): Promise<HealthResponse> {
    await this.prisma.$queryRaw`SELECT 1`;

    return { status: 'ok', database: 'up' };
  }
}
