import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * sharp is a native module. Bundling it means its platform-specific binary
   * has to survive Vercel's function tracing, which is exactly the failure
   * that took the inbound webhook down: the route threw on import in
   * production while working locally. Left external, it loads from
   * node_modules at runtime like any ordinary dependency.
   */
  serverExternalPackages: ["sharp"],
};

export default nextConfig;
