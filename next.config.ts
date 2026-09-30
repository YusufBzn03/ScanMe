import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Erlaubt den Dev-Server über ngrok-Tunnel (iPhone-Test, Kamera braucht HTTPS).
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok-free.dev", "*.ngrok.app"],
};

export default nextConfig;
