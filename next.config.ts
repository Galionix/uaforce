import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  api: {
    responseLimit: false,
  },
  webpack(config, { isServer }) {

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback, // Keep existing fallbacks
        fs: false, // Prevent Webpack from bundling 'fs'
        path: false, // Prevent Webpack from bundling 'path'
      };
    }
    config.module.rules.push({
      test: /\.svg$/,
      use: [
        {
          loader: '@svgr/webpack',
          options: {
            svgoConfig: { plugins: [{ name: 'removeViewBox', active: false }] }
          }
        }
      ]
    });
    return config;
  },

  poweredByHeader: false,
  trailingSlash: true,
  images: { loader: 'custom' },
};

export default nextConfig;
