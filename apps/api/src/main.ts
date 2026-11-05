import 'reflect-metadata';
import { resolve } from 'node:path';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { configureAuthHttp } from './auth/auth.http';
import { SESSION_COOKIE } from './auth/auth.config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  if (process.env.SERVE_WEB === 'true') {
    app.set('trust proxy', 1);
    const web = resolve(__dirname, '../../web/dist');
    app.useStaticAssets(web);
    app.getHttpAdapter().getInstance().get(/^\/(?!api(?:\/|$)).*/, (_request: unknown, response: { sendFile(path: string): void }) => response.sendFile(resolve(web, 'index.html')));
  }
  app.setGlobalPrefix('api');
  configureAuthHttp(app, config);
  app.enableShutdownHooks();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  app.useGlobalFilters(new HttpExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Sistema de Estoque V2')
    .setDescription('API do monólito modular de estoque')
    .setVersion('0.1.0')
    .addCookieAuth(SESSION_COOKIE)
    .build();
  SwaggerModule.setup(
    'api/docs',
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  await app.listen(config.getOrThrow<number>('API_PORT'));
}

void bootstrap();
