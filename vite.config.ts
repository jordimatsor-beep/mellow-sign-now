import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("pdf-lib") || id.includes("jszip")) return "pdf";
          if (id.includes("lucide-react")) return "icons";
          if (id.includes("@radix-ui") || id.includes("cmdk") || id.includes("vaul") || id.includes("embla")) return "ui";
          if (id.includes("recharts") || id.includes("d3-") || id.includes("victory")) return "charts";
          if (id.includes("i18next") || id.includes("react-i18next")) return "i18n";
          if (id.includes("@stripe") || id.includes("stripe")) return "stripe";
          if (id.includes("@anthropic-ai")) return "ai";
          if (id.includes("date-fns")) return "dates";
          if (id.includes("zod") || id.includes("react-hook-form") || id.includes("@hookform")) return "forms";
          if (id.includes("@tanstack")) return "tanstack";
          if (id.includes("react-router") || id.includes("react-router-dom")) return "router";
          return "vendor";
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
}));
