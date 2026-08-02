import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { configureApp } from './app.config';
import { AppModule } from './app.module';
import { EnvironmentVariables } from './config/environment';
import { configureSwagger } from './docs/swagger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService<EnvironmentVariables, true>);

  configureApp(app);
  configureSwagger(app);
  app.enableShutdownHooks();

  await app.listen(configService.get('PORT', { infer: true }));
}

void bootstrap();
