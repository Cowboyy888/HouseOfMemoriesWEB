import { Module } from "@nestjs/common";
import { CarsController } from "./cars.controller";
import { ListCarsUseCase } from "./application/list-cars.use-case";
import { GetCarByIdUseCase } from "./application/get-car-by-id.use-case";
import { CAR_REPOSITORY } from "./domain/car.repository";
import { PrismaCarRepository } from "./infrastructure/prisma-car.repository";

@Module({
  controllers: [CarsController],
  providers: [
    ListCarsUseCase,
    GetCarByIdUseCase,
    { provide: CAR_REPOSITORY, useClass: PrismaCarRepository },
  ],
})
export class CarsModule {}
