import type { NextConfig } from "next";

const internalApiBaseUrl = (
  process.env.API_BASE_URL ?? "http://localhost:4000/api/v1"
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.215.216.104", "10.215.160.135"],
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${internalApiBaseUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
