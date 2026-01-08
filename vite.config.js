import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/", // تأكد من هذا
  build: {
    outDir: "dist",
    rollupOptions: {
      output: {
        // تأكد من الملفات تبقى .js
        entryFileNames: `[name].js`,
        chunkFileNames: `[name].js`,
        assetFileNames: `[name].[ext]`,
      },
    },
  },
  server: {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
    },
  },
});
