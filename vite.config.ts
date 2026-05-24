import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api/luma": {
        target: "https://api2.luma.com",
        changeOrigin: true,
        rewrite: (requestPath) => requestPath.replace(/^\/api\/luma/, ""),
      },
    },
  },
})
