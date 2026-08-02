import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  environmentFilePaths,
  environmentValidationSchema,
} from './config/environment';
import { HealthModule } from './health/health.module';
import { HotelsModule } from './hotels/hotels.module';
import { NotablePeopleModule } from './notable-people/notable-people.module';

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
    HotelsModule,
    NotablePeopleModule,
  ],
})
export class AppModule {}
