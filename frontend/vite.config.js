import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  root: "src",
  envDir: "../",
  build: { outDir: "../dist", emptyOutDir: true },
  test: {
    environment: "jsdom",
    globals: true,
  },
});
