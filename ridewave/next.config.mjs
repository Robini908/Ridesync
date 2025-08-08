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
};

export default nextConfig;