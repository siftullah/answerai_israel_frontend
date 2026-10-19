import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Dev is accessed through the Herd proxy (app.answerai.co.il.test -> localhost:3000);
  // without this Next.js blocks the cross-origin requests to dev assets and HMR.
  allowedDevOrigins: ["app.answerai.co.il.test"],
};

// Wires i18n/request.ts (cookie-based locale, no URL prefix).
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl(nextConfig);
