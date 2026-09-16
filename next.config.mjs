/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  experimental: { optimizePackageImports: ['@supabase/supabase-js'] }
};
export default nextConfig;
