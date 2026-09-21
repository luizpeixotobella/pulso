import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "bkmzbbohunqkmcaeppqf.supabase.co" },
      { protocol: "https", hostname: "cdn.colab55.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "m.media-amazon.com" },
      { protocol: "https", hostname: "placehold.co" },
    ],
  },
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "Content-Security-Policy", value: "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: blob: https://bkmzbbohunqkmcaeppqf.supabase.co https://cdn.colab55.com https://images.unsplash.com https://m.media-amazon.com https://placehold.co; media-src 'self' blob: https://bkmzbbohunqkmcaeppqf.supabase.co; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://bkmzbbohunqkmcaeppqf.supabase.co wss://bkmzbbohunqkmcaeppqf.supabase.co https://api.openai.com https://graph.facebook.com; upgrade-insecure-requests" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
      ],
    }];
  },
};

export default nextConfig;
