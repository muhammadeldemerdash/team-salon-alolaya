import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://muhammadeldemerdash.github.io",
  base: "/team-salon-alolaya",
  output: "static",
  trailingSlash: "always",
  compressHTML: false,
  build: {
    format: "file"
  }
});