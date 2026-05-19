/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
  },
  // Prevent browsers from caching page HTML — fixes stale chunk 404s after deploy
  async headers() {
    return [
      {
        // Match all page routes but NOT static assets (/_next/static handled by Next.js)
        source: '/((?!_next/static|_next/image|favicon|icons|og-image|apple-touch).*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
        ],
      },
    ];
  },

  async redirects() {
    return [
      // Alias sin guion para que Meta acepte la URL en su formulario
      {
        source: '/datadeletion',
        destination: '/data-deletion',
        permanent: true,
      },
    ];
  },
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname, 'src');
    return config;
  },
};

module.exports = nextConfig;
