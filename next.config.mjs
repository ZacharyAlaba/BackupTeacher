/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      "/api/admin/time-slots": ["./app/data/time_slots.csv"],
    },
  },
};

export default nextConfig;
