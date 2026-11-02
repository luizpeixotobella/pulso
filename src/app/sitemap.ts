import type { MetadataRoute } from "next";

const siteUrl = "https://pulso.rocks";

const publicRoutes = [
  { path: "/", priority: 1 },
  { path: "/timeline", priority: 0.9 },
  { path: "/solos", priority: 0.8 },
  { path: "/solos/pulso", priority: 0.9 },
  { path: "/solos/pulso/entrar", priority: 0.6 },
  { path: "/solos/pulso/regras", priority: 0.5 },
  { path: "/solos/pulso/seguranca", priority: 0.5 },
  { path: "/solos/pulso/agentes", priority: 0.6 },
  { path: "/roadmap", priority: 0.5 },
  { path: "/privacy-policy", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes.map(({ path, priority }) => ({
    url: new URL(path, siteUrl).toString(),
    changeFrequency: "weekly",
    priority,
  }));
}
