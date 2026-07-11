import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { BookingWidget } from "@/features/bookings/components/booking-widget";
import { fetchCarById } from "@/features/cars/api";
import { CarGallery } from "@/features/cars/components/car-gallery";
import { formatCurrency } from "@/lib/format";
import { buildCarJsonLd } from "@/lib/structured-data";

interface CarDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: CarDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const car = await fetchCarById(id);

  if (!car) {
    return { title: "Car not found | DriveHub" };
  }

  const title = `${car.brand.name} ${car.model} (${car.year}) | DriveHub`;
  const description = `${car.condition} ${car.brand.name} ${car.model} in ${car.color}, ${car.category.name.toLowerCase()} category. ${
    car.listingType === "RENTAL" ? "Available to rent." : car.listingType === "SALE" ? "Available to buy." : "Available to rent or buy."
  }`;

  const images = car.images[0] ? [car.images[0].url] : undefined;

  return {
    title,
    description,
    alternates: {
      canonical: `/cars/${car.id}`,
    },
    openGraph: {
      title,
      description,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images,
    },
  };
}

const listingTypeLabel: Record<string, string> = {
  RENTAL: "For Rent",
  SALE: "For Sale",
  BOTH: "Rent or Buy",
};

export default async function CarDetailPage({ params }: CarDetailPageProps) {
  const { id } = await params;
  const car = await fetchCarById(id);

  if (!car) {
    notFound();
  }

  const dailyRate = formatCurrency(car.dailyRentalRate);
  const salePrice = formatCurrency(car.salePrice);
  const carJsonLd = buildCarJsonLd(car);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(carJsonLd) }}
      />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[3fr_2fr]">
        <div>
          <CarGallery images={car.images} alt={`${car.brand.name} ${car.model}`} />

          <div className="mt-6">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{listingTypeLabel[car.listingType]}</Badge>
              <Badge variant="outline">{car.condition.replace(/_/g, " ")}</Badge>
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              {car.brand.name} {car.model} ({car.year})
            </h1>
            <p className="mt-1 text-muted-foreground">
              {car.category.name} &middot; {car.color} &middot; {car.trim ?? "Base trim"}
            </p>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-4 rounded-xl border p-4 sm:grid-cols-4">
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Mileage</dt>
              <dd className="font-medium">{car.mileage.toLocaleString()} mi</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Fuel</dt>
              <dd className="font-medium">{car.fuelType.replace(/_/g, " ")}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Transmission</dt>
              <dd className="font-medium">{car.transmission}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Seats</dt>
              <dd className="font-medium">{car.seatingCapacity}</dd>
            </div>
          </dl>

          {car.features.length > 0 && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold">Features</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {car.features.map((feature) => (
                  <Badge key={feature.id} variant="outline">
                    {feature.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8">
            <h2 className="text-lg font-semibold">Reviews</h2>
            {car.reviews.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No reviews yet for this car.</p>
            ) : (
              <ul className="mt-2 space-y-3">
                {car.reviews.map((review) => (
                  <li key={review.id} className="rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{review.rating}/5</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {review.comment && <p className="mt-1 text-sm">{review.comment}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <aside className="h-fit rounded-xl border p-6">
          <p className="text-sm text-muted-foreground">Location</p>
          <p className="font-medium">
            {car.currentLocation ? `${car.currentLocation.name} (${car.currentLocation.city}, ${car.currentLocation.state})` : "Unavailable"}
          </p>

          <div className="mt-4 space-y-1">
            {dailyRate && (
              <p className="text-2xl font-bold">
                {dailyRate}
                <span className="text-sm font-normal text-muted-foreground"> / day</span>
              </p>
            )}
            {salePrice && <p className="text-muted-foreground">{salePrice} to buy</p>}
          </div>

          {(car.listingType === "RENTAL" || car.listingType === "BOTH") && car.currentLocation && (
            <div className="mt-6 border-t pt-6">
              <BookingWidget carId={car.id} locationId={car.currentLocation.id} />
            </div>
          )}

          {car.listingType === "SALE" && (
            <p className="mt-4 text-sm text-muted-foreground">Purchase checkout is coming in a later feature sprint.</p>
          )}
        </aside>
      </div>
    </main>
  );
}
