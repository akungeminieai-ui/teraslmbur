import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    '@teras-lmbur/ui',
    '@teras-lmbur/utils',
    '@teras-lmbur/hooks',
    '@teras-lmbur/types'
  ]
};

export default nextConfig;
