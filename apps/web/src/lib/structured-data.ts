import type { CarDetail } from "@drivehub/contracts";
import { env } from "@/lib/env";

const conditionSchema: Record<string, string> = {
  NEW: "https://schema.org/NewCondition",
  USED: "https://schema.org/UsedCondition",
  CERTIFIED_PRE_OWNED: "https://schema.org/UsedCondition",
};

const availabilitySchema: Record<string, string> = {
  AVAILABLE: "https://schema.org/InStock",
  RESERVED: "https://schema.org/LimitedAvailability",
  RENTED: "https://schema.org/OutOfStock",
  SOLD: "https://schema.org/SoldOut",
  MAINTENANCE: "https://schema.org/OutOfStock",
  INACTIVE: "https://schema.org/Discontinued",
};

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "DriveHub",
    url: env.siteUrl,
  };
}

export function buildWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "DriveHub",
    url: env.siteUrl,
  };
}

export function buildCarJsonLd(car: CarDetail) {
  const pageUrl = `${env.siteUrl}/cars/${car.id}`;
  const images = car.images.map((image) => image.url);
  const availability = availabilitySchema[car.status] ?? "https://schema.org/InStock";

  const offers: Record<string, unknown>[] = [];
  if ((car.listingType === "RENTAL" || car.listingType === "BOTH") && car.dailyRentalRate) {
    offers.push({
      "@type": "Offer",
      businessFunction: "https://schema.org/LeaseOut",
      price: car.dailyRentalRate,
      priceCurrency: "USD",
      availability,
      url: pageUrl,
    });
  }
  if ((car.listingType === "SALE" || car.listingType === "BOTH") && car.salePrice) {
    offers.push({
      "@type": "Offer",
      businessFunction: "https://schema.org/Sell",
      price: car.salePrice,
      priceCurrency: "USD",
      availability,
      url: pageUrl,
    });
  }

  const aggregateRating =
    car.reviews.length > 0
      ? {
          "@type": "AggregateRating",
          ratingValue: (car.reviews.reduce((sum, review) => sum + review.rating, 0) / car.reviews.length).toFixed(1),
          reviewCount: car.reviews.length,
        }
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Vehicle",
    name: `${car.brand.name} ${car.model} (${car.year})`,
    url: pageUrl,
    brand: { "@type": "Brand", name: car.brand.name },
    model: car.model,
    vehicleModelDate: String(car.year),
    color: car.color,
    vehicleIdentificationNumber: car.vin,
    mileageFromOdometer: {
      "@type": "QuantitativeValue",
      value: car.mileage,
      unitText: "mi",
    },
    vehicleTransmission: car.transmission,
    fuelType: car.fuelType,
    vehicleSeatingCapacity: car.seatingCapacity,
    itemCondition: conditionSchema[car.condition] ?? "https://schema.org/UsedCondition",
    category: car.category.name,
    ...(images.length > 0 ? { image: images } : {}),
    ...(offers.length > 0 ? { offers } : {}),
    ...(aggregateRating ? { aggregateRating } : {}),
  };
}
