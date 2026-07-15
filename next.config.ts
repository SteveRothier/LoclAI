import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";
import path from "path";
import { fileURLToPath } from "url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: rootDir,
  },
};

export default withSerwist(nextConfig);
