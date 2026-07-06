import { Inject, Injectable } from "@nestjs/common";
import type { CarListQuery, CarListResponse } from "@drivehub/contracts";
import { CAR_REPOSITORY, type CarRepository } from "../domain/car.repository";
import { toCarSummary } from "./car.mapper";

@Injectable()
export class ListCarsUseCase {
  constructor(@Inject(CAR_REPOSITORY) private readonly carRepository: CarRepository) {}

  async execute(query: CarListQuery): Promise<CarListResponse> {
    const result = await this.carRepository.findMany(query);
    return {
      items: result.items.map(toCarSummary),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }
}
