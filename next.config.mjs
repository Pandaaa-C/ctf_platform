/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    // Keep the native pg driver external so Next doesn't bundle it oddly.
    serverComponentsExternalPackages: ["pg", "drizzle-orm"],
  },
};

export default nextConfig;
