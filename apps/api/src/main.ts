import "dotenv/config";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { toNodeHandler } from "better-auth/node";
import express from "express";
import { AppModule } from "./app.module";
import { auth } from "./modules/auth/auth";
import { getAllowedOrigins } from "./shared/config/allowed-origins";

async function bootstrap() {
  // Nest's default body-parser middleware would consume the request body
  // before Better Auth's handler gets to read it as a raw Fetch Request, so
  // it's disabled globally and re-applied below, *after* mounting the auth
  // handler — Express only invokes a `.use(path, ...)` middleware for
  // requests under that path, so /api/auth/* never reaches express.json().
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  app.enableCors({
    origin: getAllowedOrigins(),
    credentials: true,
  });

  app.use("/api/auth", toNodeHandler(auth));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.setGlobalPrefix("api");
  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port}/api`);
}

bootstrap();
