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
    ],
  },
};

export default nextConfig;
