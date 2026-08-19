import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/apex/:slug/.well-known/agent-card.json",
        destination: "/api/apex/:slug/card",
      },
    ];
  },
};

export default nextConfig;
