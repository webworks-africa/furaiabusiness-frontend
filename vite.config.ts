import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  if (command === "build" && env.VITE_API_MODE === "mock")
    throw new Error(
      "Release blocked: mock mode is development-only. Set VITE_API_MODE=real.",
    );
  return {
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    plugins: [
      react(),
      tailwindcss(),
      {
        name: "exclude-mock-worker",
        closeBundle() {
          rmSync("dist/mockServiceWorker.js", { force: true });
        },
      },
    ],
    server: {
      host: "127.0.0.1",
      allowedHosts: ["terminal.local"],
      port: 5174,
      strictPort: true,
    },
    optimizeDeps: { include: ["pdfjs-dist/legacy/build/pdf.mjs"] },
    build: { sourcemap: false },
  };
});
