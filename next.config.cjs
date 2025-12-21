/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow API calls to backend (same origin or configured backend)
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NEXT_PUBLIC_API_BASE_URL 
          ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/:path*`
          : '/api/:path*', // Fallback to same origin
      },
    ];
  },
};

module.exports = nextConfig;
