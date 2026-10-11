import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev badge covered nav/brew controls in every corner (and blocked E2E clicks). Error overlays still show.
  devIndicators: false,
  images: {
    // OAuth profile pictures (Google, Kakao).
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "**.kakaocdn.net" },
      { protocol: "http", hostname: "**.kakaocdn.net" },
    ],
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
