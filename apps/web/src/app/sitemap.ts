import type { MetadataRoute } from "next";
import { fetchCars } from "@/features/cars/api";
import { env } from "@/lib/env";

const staticRoutes: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }> = [
  { path: "", priority: 1, changeFrequency: "daily" },
  { path: "/cars", priority: 0.9, changeFrequency: "daily" },
  { path: "/sign-in", priority: 0.3, changeFrequency: "monthly" },
  { path: "/sign-up", priority: 0.3, changeFrequency: "monthly" },
];

const PAGE_SIZE = 50;

async function fetchAllCarIds(): Promise<string[]> {
  const ids: string[] = [];
  let page = 1;
  let total = Infinity;

  try {
    while ((page - 1) * PAGE_SIZE < total) {
      const result = await fetchCars({ page, pageSize: PAGE_SIZE });
      total = result.total;
      ids.push(...result.items.map((car) => car.id));
      if (result.items.length === 0) break;
      page += 1;
    }
  } catch {
    return ids;
  }

  return ids;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = env.siteUrl;

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map(({ path, priority, changeFrequency }) => ({
    url: `${baseUrl}${path}`,
    changeFrequency,
    priority,
  }));

  const carIds = await fetchAllCarIds();
  const carEntries: MetadataRoute.Sitemap = carIds.map((id) => ({
    url: `${baseUrl}/cars/${id}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticEntries, ...carEntries];
}
