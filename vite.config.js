import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist", // مكان ملفات البيلد النهائي
    sourcemap: false,
  },
  base: "./", // مهم لتشغيل SPA على Vercel أو أي سيرفر ثابت
});
