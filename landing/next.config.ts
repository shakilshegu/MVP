import type { NextConfig } from 'next'

// Static export: the whole site is plain HTML/CSS/JS in out/, so it can be hosted anywhere (Vercel, Netlify, any web server).
const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
}

export default nextConfig
