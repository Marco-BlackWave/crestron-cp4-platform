import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/src/simplplus/")) {
            return "feature-simplplus";
          }

          if (id.includes("node_modules")) {
            if (id.includes("@codemirror")) {
              return "vendor-codemirror";
            }

            if (id.includes("react") || id.includes("react-router") || id.includes("scheduler")) {
              return "vendor-react";
            }

            if (id.includes("zod")) {
              return "vendor-zod";
            }

            return "vendor";
          }

          return undefined;
        }
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true
      },
      "/xpanel": {
        target: "http://localhost:5000",
        changeOrigin: true
      }
    }
  }
});
