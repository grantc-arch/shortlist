import type { MetadataRoute } from "next";
import { listListableCompanies, listListableJobs } from "@/lib/queries";
import { googleJobsEnabled, siteUrl } from "@/lib/site";

// Jobs open and close all the time, so build the sitemap on each request.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const pages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/jobs`, changeFrequency: "hourly", priority: 0.9 },
  ];
  if (!googleJobsEnabled()) return pages;

  const [jobs, companies] = await Promise.all([listListableJobs(), listListableCompanies()]);
  return [
    ...pages,
    ...jobs.map((j) => ({
      url: `${base}/jobs/${j.id}`,
      lastModified: j.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...companies.map((c) => ({ url: `${base}/companies/${c.id}`, changeFrequency: "weekly" as const, priority: 0.5 })),
  ];
}
