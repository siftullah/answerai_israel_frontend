import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev is accessed through the Herd proxy (app.answerai.co.il.test -> localhost:3000);
  // without this Next.js blocks the cross-origin requests to dev assets and HMR.
  allowedDevOrigins: ["app.answerai.co.il.test"],
};

export default nextConfig;
