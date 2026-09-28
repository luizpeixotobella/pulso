import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/", "/solos/pulso/convite"],
    },
    sitemap: "https://pulso.rocks/sitemap.xml",
  };
}
