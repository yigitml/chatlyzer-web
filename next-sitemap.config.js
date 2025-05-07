/** @type {import('next-sitemap').IConfig} */
module.exports = {
  // TODO: change to the correct site url
  siteUrl: "https://chatlyzerai.com",
  generateRobotsTxt: true,
  // TODO: add the correct exclude paths
  exclude: [
    "/404",
    "/api/*",
    "/admin",
    "/home",
    "/new-model",
    "/onboarding",
    "/onboarding-freemium",
    "/profile",
    "/credits",
    "/unauthorized",
    "/legal/*",
  ],
  changefreq: "daily",
  priority: 0.7,

  additionalPaths: async (config) => {
    // TODO: add the correct dynamic paths
    const dynamicPaths = ["/", "/auth/signin", "/features"];

    return dynamicPaths.map((path) => ({
      loc: path,
      lastmod: new Date().toISOString(),
      priority: 0.8,
    }));
  },
};
