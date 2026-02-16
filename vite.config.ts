import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import type { Plugin } from "vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    // Compatibility: some environments request env.mjs directly under node_modules.
    // Redirect to Vite's internal endpoint to avoid 404s in preview proxies.
    ({
      name: "env-mjs-compat-redirect",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === "/node_modules/vite/dist/client/env.mjs") {
            res.statusCode = 302;
            res.setHeader("Location", "/@vite/env");
            res.end();
            return;
          }
          next();
        });
      },
    } as Plugin),
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "react-native": "react-native-web",
    },
  },
  define: {
    'process.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL),
    'process.env.VITE_SIGNALING_URL': JSON.stringify(process.env.VITE_SIGNALING_URL),
  },
}));
