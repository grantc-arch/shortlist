import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private dashboards, sign-in pages and CVs have no place in search results.
      disallow: ["/employer", "/candidate", "/cv/", "/login", "/signup", "/forgot-password", "/reset-password", "/jobs/*/apply"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
