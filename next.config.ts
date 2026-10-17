import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev is accessed through the Herd proxy (app.answerai.com.au.test -> localhost:3000);
  // without this Next.js blocks the cross-origin requests to dev assets and HMR.
  allowedDevOrigins: ["app.answerai.com.au.test"],
};

export default nextConfig;
