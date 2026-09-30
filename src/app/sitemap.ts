import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = (process.env.NEXT_PUBLIC_APP_URL || "https://chatlyzerai.com").replace(/\/$/, "");
  return ["", "/contact", "/privacy", "/terms"].map(path => ({ url: `${origin}${path}` }));
}
