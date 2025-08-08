import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Enable new caching behavior for Next.js 15
    staleTimes: {
      dynamic: 30,
      static: 180,
    }
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "files.stripe.com" },
      { protocol: "https", hostname: "utfs.io" }, // UploadThing
      { protocol: "https", hostname: "uploadthing.com" }, // UploadThing
    ]
  },
  // External packages that should not be bundled
  serverExternalPackages: ["nodemailer", "mjml"],
  // Bundle pages router dependencies for better performance
  bundlePagesRouterDependencies: true,
  // Webpack optimizations to reduce cache warnings
  webpack: (config, { dev, isServer }) => {
    // Fix for "exports is not defined" error
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    }
    
    if (!dev && !isServer) {
      // Optimize webpack cache for production
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
        cacheDirectory: __dirname + '/.next/cache',
        maxAge: 172800000, // 2 days
      }
    }
    
    // Optimize large string serialization
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      },
    }
    
    return config
  },
};

export default nextConfig;