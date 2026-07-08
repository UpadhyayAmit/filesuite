import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = dirname(fileURLToPath(import.meta.url));
const securityHeaders = [
  {
    key: 'Referrer-Policy',
    value: 'no-referrer',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
  {
    key: 'Content-Security-Policy',
    value:
      "default-src 'self'; script-src 'self' 'wasm-unsafe-eval' https://www.clarity.ms; worker-src 'self' blob:; child-src 'self' blob:; frame-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://www.clarity.ms https://c.clarity.ms; font-src 'self'; connect-src 'self' https://www.clarity.ms https://c.clarity.ms https://*.clarity.ms; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: appRoot,
  },
  webpack(config, { isServer }) {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        process: false,
      };
    }

    return config;
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
