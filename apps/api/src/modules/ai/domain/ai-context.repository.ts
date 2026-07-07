export interface CustomerBookingSummary {
  bookingNumber: string;
  status: string;
  startDate: Date;
  endDate: Date;
  carLabel: string;
}

export interface CarCatalogSummary {
  brand: string;
  model: string;
  year: number;
  category: string;
  listingType: string;
  dailyRentalRate: number | null;
  salePrice: number | null;
}

export const AI_CONTEXT_REPOSITORY = Symbol("AI_CONTEXT_REPOSITORY");

/** Read-only context for grounding the assistant's answers in real data —
 * reads Car/Booking directly rather than importing BookingsModule, same
 * "lightweight cross-cutting read, not a business-logic dependency"
 * pattern PayableResolver already established in Payments Module 1. */
export interface AiContextRepository {
  findAvailableCarsSummary(limit: number): Promise<CarCatalogSummary[]>;
  findRecentBookingsForCustomer(customerId: string, limit: number): Promise<CustomerBookingSummary[]>;
}
