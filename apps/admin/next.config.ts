import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // images.remotePatterns intentionally unset — no car photo host is chosen/seeded yet
  // (CarImage rows aren't populated). Add the real host (S3/Cloudinary/R2/etc.) here
  // before any external car photo URL goes live, or next/image will reject it at runtime.
};

export default nextConfig;
