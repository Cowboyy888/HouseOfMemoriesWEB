export interface RentableCar {
  id: string;
  categoryId: string;
  dailyRentalRate: number;
}

export const CAR_AVAILABILITY_REPOSITORY = Symbol("CAR_AVAILABILITY_REPOSITORY");

export interface CarAvailabilityRepository {
  /** Null if the car doesn't exist, is deleted, isn't listed for rental, or
   * has no daily rate set. */
  findRentableCar(carId: string): Promise<RentableCar | null>;

  /** App-level pre-check (fast, friendly error) — the GiST exclusion
   * constraint on `bookings` is the authoritative backstop for the race
   * condition this can't fully close on its own. */
  hasOverlap(carId: string, startDate: Date, endDate: Date, excludeBookingId?: string): Promise<boolean>;
}
