import { describe, expect, it, vi } from "vitest";
import type { CarListFilters } from "../domain/car.repository";
import { PrismaCarRepository } from "./prisma-car.repository";
import type { PrismaService } from "../../../shared/database/prisma.service";

const baseFilters: CarListFilters = { page: 1, pageSize: 20 };

function makePrisma() {
  const findMany = vi.fn().mockResolvedValue([]);
  const count = vi.fn().mockResolvedValue(0);
  const prisma = { client: { car: { findMany, count } } } as unknown as PrismaService;
  return { prisma, findMany, count };
}

describe("PrismaCarRepository.findMany", () => {
  it("always excludes soft-deleted cars regardless of other filters", async () => {
    const { prisma, findMany } = makePrisma();
    const repository = new PrismaCarRepository(prisma);

    await repository.findMany(baseFilters);

    expect(findMany.mock.calls[0][0].where).toMatchObject({ deletedAt: null });
  });

  it("expands a RENTAL search to also match cars listed as BOTH", async () => {
    const { prisma, findMany } = makePrisma();
    const repository = new PrismaCarRepository(prisma);

    await repository.findMany({ ...baseFilters, listingType: "RENTAL" });

    expect(findMany.mock.calls[0][0].where.listingType).toEqual({ in: ["RENTAL", "BOTH"] });
  });

  it("expands a SALE search to also match cars listed as BOTH", async () => {
    const { prisma, findMany } = makePrisma();
    const repository = new PrismaCarRepository(prisma);

    await repository.findMany({ ...baseFilters, listingType: "SALE" });

    expect(findMany.mock.calls[0][0].where.listingType).toEqual({ in: ["SALE", "BOTH"] });
  });

  it("keeps an explicit BOTH search as an exact match, not expanded further", async () => {
    const { prisma, findMany } = makePrisma();
    const repository = new PrismaCarRepository(prisma);

    await repository.findMany({ ...baseFilters, listingType: "BOTH" });

    expect(findMany.mock.calls[0][0].where.listingType).toBe("BOTH");
  });

  it("omits the listingType filter entirely when none was requested", async () => {
    const { prisma, findMany } = makePrisma();
    const repository = new PrismaCarRepository(prisma);

    await repository.findMany(baseFilters);

    expect(findMany.mock.calls[0][0].where.listingType).toBeUndefined();
  });

  it("builds a two-sided dailyRentalRate range when both minPrice and maxPrice are given", async () => {
    const { prisma, findMany } = makePrisma();
    const repository = new PrismaCarRepository(prisma);

    await repository.findMany({ ...baseFilters, minPrice: 50, maxPrice: 100 });

    expect(findMany.mock.calls[0][0].where.dailyRentalRate).toEqual({ gte: 50, lte: 100 });
  });

  it("builds a one-sided dailyRentalRate range when only minPrice is given", async () => {
    const { prisma, findMany } = makePrisma();
    const repository = new PrismaCarRepository(prisma);

    await repository.findMany({ ...baseFilters, minPrice: 50 });

    expect(findMany.mock.calls[0][0].where.dailyRentalRate).toEqual({ gte: 50 });
  });

  it("paginates using (page - 1) * pageSize as the skip offset", async () => {
    const { prisma, findMany } = makePrisma();
    const repository = new PrismaCarRepository(prisma);

    await repository.findMany({ page: 3, pageSize: 10 });

    expect(findMany.mock.calls[0][0]).toMatchObject({ skip: 20, take: 10 });
  });

  it("runs the count query with the exact same where clause used for findMany", async () => {
    const { prisma, findMany, count } = makePrisma();
    const repository = new PrismaCarRepository(prisma);

    await repository.findMany({ ...baseFilters, brandSlug: "toyota", minPrice: 40 });

    expect(count.mock.calls[0][0].where).toEqual(findMany.mock.calls[0][0].where);
  });
});
