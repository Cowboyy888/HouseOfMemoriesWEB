import { Inject, Injectable } from "@nestjs/common";
import type { CarDetail } from "@drivehub/contracts";
import { CAR_REPOSITORY, type CarRepository } from "../domain/car.repository";
import { toCarDetail } from "./car.mapper";

@Injectable()
export class GetCarByIdUseCase {
  constructor(@Inject(CAR_REPOSITORY) private readonly carRepository: CarRepository) {}

  async execute(id: string): Promise<CarDetail | null> {
    const car = await this.carRepository.findById(id);
    return car ? toCarDetail(car) : null;
  }
}
