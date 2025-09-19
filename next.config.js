/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async redirects() {
    return [
      // Redirect www.duoaxs.com → duoaxs.com
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.duoaxs.com' }],
        destination: 'https://duoaxs.com/:path*',
        permanent: true,
      },
      // Redirect http:// → https://
      {
        source: '/:path*',
        has: [{ type: 'protocol', value: 'http' }],
        destination: 'https://duoaxs.com/:path*',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
