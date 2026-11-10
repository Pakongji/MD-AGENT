import { cpSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const root = fileURLToPath(new URL(".", import.meta.url));
const repository = resolve(root, "..");

export default defineConfig(({ mode }) => {
  // Only frontend/.env* is read here. Root server secrets never enter the bundle.
  const env = loadEnv(mode, root, "DEV_");
  const target = env.DEV_BACKEND_ORIGIN || "http://127.0.0.1:3000";
  return {
    root,
    plugins: [react(), {
      name: "shared-public-assets",
      closeBundle() { cpSync(resolve(repository, "public"), resolve(root, "dist"), { recursive: true }); },
    }, {
      name: "browser-only-boundary",
      resolveId(id) {
        if (/^(?:node:|@prisma\/|.*(?:\/lib\/db\/|\/generated\/prisma(?:\/|$)))/.test(id)) {
          throw new Error(`Server module cannot be included in the Pages frontend: ${id}`);
        }
      },
    }],
    resolve: {
      dedupe: ["react", "react-dom"],
      alias: [
        { find: "next/link", replacement: resolve(root, "src/compat/link.tsx") },
        { find: "next/navigation", replacement: resolve(root, "src/compat/navigation.ts") },
        { find: "next-auth/react", replacement: resolve(root, "src/compat/auth.tsx") },
        { find: "@/components/common/page-tabs", replacement: resolve(root, "src/compat/page-tabs.tsx") },
        { find: "@", replacement: repository },
        // Shared source lives above frontend/. Resolve its browser dependencies
        // here as well, so CI never needs the server's node_modules or Prisma.
        ...["react", "react-dom", "react-router-dom", "lucide-react", "recharts", "zod", "zustand"].map((name) => ({ find: name, replacement: resolve(root, "node_modules", name) })),
      ],
    },
    server: { fs: { allow: [repository] }, proxy: { "/api": { target, changeOrigin: false } } },
    preview: { proxy: { "/api": { target, changeOrigin: false } } },
    build: { outDir: "dist", emptyOutDir: true },
  };
});
