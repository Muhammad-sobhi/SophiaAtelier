/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    qualities: [75, 95],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/storage/**',
      },
      {
        protocol: 'https',
        hostname: 'api.sophiadresses.cloud',
        pathname: '/storage/**',
      },
    ],
  },
};

export default nextConfig;
