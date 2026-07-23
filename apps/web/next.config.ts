import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';



const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  transpilePackages: [
    '@teras-lmbur/ui',
    '@teras-lmbur/utils',
    '@teras-lmbur/hooks',
    '@teras-lmbur/types'
  ]
};

export default withNextIntl(nextConfig);
