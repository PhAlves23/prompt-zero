import type { NextConfig } from "next";

const isE2E = process.env.CI === "true" || process.env.E2E_FULL_STACK === "1";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  webpack: (config, { isServer, dev }) => {
    if (!isServer && dev && isE2E) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ["**/node_modules", "**/.next"],
        poll: false,
      };
    }
    return config;
  },
  devIndicators: isE2E
    ? false
    : {
        position: "bottom-right",
      },
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
};

export default nextConfig;
