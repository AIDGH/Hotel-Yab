import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  environmentFilePaths,
  environmentValidationSchema,
} from './config/environment';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: environmentFilePaths,
      validationSchema: environmentValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    HealthModule,
  ],
})
export class AppModule {}
