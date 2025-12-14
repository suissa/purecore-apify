import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname),
  build: {
    outDir: path.resolve(__dirname, "../../dist-dashboard"),
    emptyOutDir: true
  },
  server: {
    port: 9521
  }
});
