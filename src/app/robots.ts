import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard/",
          "/home/",
          "/lesson/",
          "/placement/",
          "/curriculum/",
          "/portfolio/",
          "/badges/",
          "/auth/",
        ],
      },
    ],
    sitemap: "https://www.writewhiz.com/sitemap.xml",
  };
}
