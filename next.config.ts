import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel 배포 호환성을 위해 turbopack root 설정 제거
  experimental: {
    turbo: {
      rules: {}
    }
  }
};

export default nextConfig;
