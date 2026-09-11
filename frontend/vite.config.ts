import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    // Dev parity for the no-risk headers only — no CSP here (it would
    // fight HMR); the full policy lives in nginx.conf for prod builds.
    headers: {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer",
    },
    proxy: {
      // The backend already serves everything under /api, so during local dev
      // Vite just forwards it. In production, set VITE_API_BASE_URL instead
      // and drop this proxy block.
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});
