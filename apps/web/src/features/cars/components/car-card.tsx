import Image from "next/image";
import Link from "next/link";
import type { CarSummary } from "@drivehub/contracts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

const listingTypeLabel: Record<CarSummary["listingType"], string> = {
  RENTAL: "For Rent",
  SALE: "For Sale",
  BOTH: "Rent or Buy",
};

export function CarCard({ car }: { car: CarSummary }) {
  const primaryImage = car.images.find((image) => image.isPrimary) ?? car.images[0];
  const dailyRate = formatCurrency(car.dailyRentalRate);
  const salePrice = formatCurrency(car.salePrice);

  return (
    <Link href={`/cars/${car.id}`} className="block h-full">
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader className="p-0">
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-t-xl bg-muted">
            {primaryImage ? (
              <Image
                src={primaryImage.url}
                alt={primaryImage.altText ?? `${car.brand.name} ${car.model}`}
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No photo available
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm text-muted-foreground">{car.brand.name}</p>
              <h3 className="font-semibold leading-tight">
                {car.model} ({car.year})
              </h3>
            </div>
            <Badge variant="secondary">{listingTypeLabel[car.listingType]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {car.category.name} &middot; {car.color}
          </p>
        </CardContent>
        <CardFooter className="flex items-center justify-between p-4 pt-0">
          {dailyRate && <span className="font-semibold">{dailyRate}/day</span>}
          {salePrice && <span className="text-sm text-muted-foreground">{salePrice} to buy</span>}
        </CardFooter>
      </Card>
    </Link>
  );
}
