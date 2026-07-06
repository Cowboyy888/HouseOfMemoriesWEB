import { Controller, Get, NotFoundException, Param, Query } from "@nestjs/common";
import { CarListQuerySchema, type CarListQuery } from "@drivehub/contracts";
import { ZodValidationPipe } from "../../shared/validation/zod-validation.pipe";
import { ListCarsUseCase } from "./application/list-cars.use-case";
import { GetCarByIdUseCase } from "./application/get-car-by-id.use-case";

@Controller("cars")
export class CarsController {
  constructor(
    private readonly listCarsUseCase: ListCarsUseCase,
    private readonly getCarByIdUseCase: GetCarByIdUseCase,
  ) {}

  @Get()
  list(@Query(new ZodValidationPipe(CarListQuerySchema)) query: CarListQuery) {
    return this.listCarsUseCase.execute(query);
  }

  @Get(":id")
  async detail(@Param("id") id: string) {
    const car = await this.getCarByIdUseCase.execute(id);
    if (!car) {
      throw new NotFoundException(`Car ${id} not found`);
    }
    return car;
  }
}
