import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.alicdn.com",
      },
      {
        protocol: "http",
        hostname: "**.alicdn.com",
      },
      {
        protocol: "https",
        hostname: "cms2.devback.website",
      },
      {
        protocol: "https",
        hostname: "**.1688.com",
      },
      {
        protocol: "http",
        hostname: "**.1688.com",
      },
    ],
  },
};

export default nextConfig;
