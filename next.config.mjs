/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Banner images referenced by the CTA fragment can live on any AEM
  // publish/DAM host, so we use plain <img> (no next/image domain allow-list
  // needed). Nothing here restricts remote image hosts.
};

export default nextConfig;
