import type { CarListQuery, ListingType } from "@drivehub/contracts";

export type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseCarListSearchParams(searchParams: RawSearchParams): Partial<CarListQuery> {
  const brandSlug = first(searchParams.brandSlug);
  const categorySlug = first(searchParams.categorySlug);
  const listingType = first(searchParams.listingType) as ListingType | undefined;
  const locationCode = first(searchParams.locationCode);
  const minPrice = first(searchParams.minPrice);
  const maxPrice = first(searchParams.maxPrice);
  const page = first(searchParams.page);

  return {
    ...(brandSlug ? { brandSlug } : {}),
    ...(categorySlug ? { categorySlug } : {}),
    ...(listingType ? { listingType } : {}),
    ...(locationCode ? { locationCode } : {}),
    ...(minPrice ? { minPrice: Number(minPrice) } : {}),
    ...(maxPrice ? { maxPrice: Number(maxPrice) } : {}),
    page: page ? Number(page) : 1,
    pageSize: 20,
  };
}
