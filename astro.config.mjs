import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://muhammadeldemerdash.github.io",
  output: "static",
  trailingSlash: "always",
  compressHTML: false,
  build: {
    format: "file"
  }
});