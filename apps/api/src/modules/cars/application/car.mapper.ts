import type { CarDetail, CarSummary } from "@drivehub/contracts";
import type { CarDetailEntity, CarSummaryEntity } from "../domain/car.repository";

export function toCarSummary(car: CarSummaryEntity): CarSummary {
  return {
    id: car.id,
    vin: car.vin,
    model: car.model,
    year: car.year,
    color: car.color,
    condition: car.condition,
    listingType: car.listingType,
    status: car.status,
    dailyRentalRate: car.dailyRentalRate?.toString() ?? null,
    salePrice: car.salePrice?.toString() ?? null,
    brand: {
      id: car.brand.id,
      name: car.brand.name,
      slug: car.brand.slug,
      logoUrl: car.brand.logoUrl,
    },
    category: {
      id: car.category.id,
      name: car.category.name,
      slug: car.category.slug,
    },
    currentLocation: car.currentLocation
      ? {
          id: car.currentLocation.id,
          name: car.currentLocation.name,
          code: car.currentLocation.code,
          city: car.currentLocation.city,
          state: car.currentLocation.state,
        }
      : null,
    images: car.images.map((image) => ({
      id: image.id,
      url: image.url,
      altText: image.altText,
      isPrimary: image.isPrimary,
      position: image.position,
    })),
  };
}

export function toCarDetail(car: CarDetailEntity): CarDetail {
  return {
    ...toCarSummary(car),
    trim: car.trim,
    mileage: car.mileage,
    fuelType: car.fuelType,
    transmission: car.transmission,
    seatingCapacity: car.seatingCapacity,
    features: car.featureAssignments.map((assignment) => ({
      id: assignment.feature.id,
      name: assignment.feature.name,
      icon: assignment.feature.icon,
    })),
    reviews: car.reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
    })),
  };
}
