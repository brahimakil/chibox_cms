import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.alicdn.com',
      },
      {
        protocol: 'http',
        hostname: '**.alicdn.com',
      },
      // Add other image domains as needed
      {
        protocol: 'https',
        hostname: 'cbu01.alicdn.com',
      },
      {
        protocol: 'http',
        hostname: 'cbu01.alicdn.com',
      },
    ],
  },
};

export default nextConfig;
