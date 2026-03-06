import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000', // ĐỔI LẠI TRẠNG THÁI PORT CỦA BACKEND CỦA BẠN (8000 hoặc 5000)
        changeOrigin: true,
      }
    }
  }
})
