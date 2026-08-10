import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { EnvironmentVariables } from '../config/environment';

export function configureSwagger(app: INestApplication): void {
  const configService = app.get(ConfigService<EnvironmentVariables, true>);

  if (!configService.get('SWAGGER_ENABLED', { infer: true })) {
    return;
  }

  const openApiConfig = new DocumentBuilder()
    .setTitle('Hotel-Yab API')
    .setDescription(
      'Verified hotel and notable-person relationship discovery API.',
    )
    .setVersion('1.0')
    .addTag('Health', 'API and database readiness')
    .addTag('Hotels', 'Public hotel discovery')
    .addTag('Notable People', 'Public notable-person discovery')
    .addTag(
      'Authentication',
      'Password/OTP sessions, registration, and private profiles',
    )
    .addTag('Moderation', 'Protected review and comment moderation')
    .addTag('Hotel Reviews', 'User ratings and moderated hotel reviews')
    .addTag('Video Comments', 'Collapsed-by-default travel-video discussions')
    .build();

  const documentFactory = () =>
    SwaggerModule.createDocument(app, openApiConfig);

  SwaggerModule.setup('api/docs', app, documentFactory, {
    jsonDocumentUrl: 'api/docs-json',
    customSiteTitle: 'Hotel-Yab API Docs',
  });
}
