/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.duoaxs.com',
          },
        ],
        destination: 'https://duoaxs.com/:path*',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
