/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: { bodySizeLimit: '2mb' },
  },
  allowedDevOrigins: [
    '*.preview.emergentagent.com',
    'b3071018-8ff6-4c9b-af7f-9664b8479d38.preview.emergentagent.com',
  ],
};

module.exports = nextConfig;
