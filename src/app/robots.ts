import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  const origin = (process.env.NEXT_PUBLIC_APP_URL || "https://chatlyzerai.com").replace(/\/$/, "");
  return { rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/home", "/profile", "/delete-account", "/auth/"] }, sitemap: `${origin}/sitemap.xml` };
}
