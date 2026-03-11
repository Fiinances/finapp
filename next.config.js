/** @type {import('next').NextConfig} */
const { version } = require('./package.json')

const nextConfig = {
  output: 'export',
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
  },
  distDir: 'out',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
