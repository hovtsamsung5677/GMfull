import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import { parseCorsOrigins } from "./config/configuration";
import * as express from "express";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.setGlobalPrefix("api");
  app.enableCors({
    origin: parseCorsOrigins(configService.get<string>("CORS_ORIGIN")),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.use(express.static("public"));

  const swaggerConfig = new DocumentBuilder()
    .setTitle("GREEN MALL Backend API")
    .setDescription("Backend API for navigation, advertising and analytics.")
    .setVersion("0.1.0")
    .addBearerAuth({
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT",
      in: "header",
      name: "Authorization",
    })
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, swaggerDocument);

  const port = Number(configService.get<string>("PORT")) || 3000;
  await app.listen(port, "0.0.0.0");
}

void bootstrap();
