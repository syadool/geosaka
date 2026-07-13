import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: mode === "test"
    ? { alias: { "@googlemaps/js-api-loader": fileURLToPath(new URL("./tests/mocks/googleMapsLoader.ts", import.meta.url)) } }
    : undefined,
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    pool: "vmThreads",
  },
}));
