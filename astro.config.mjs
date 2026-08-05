import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://salon-team.com",
  output: "static",
  trailingSlash: "always",
  compressHTML: false,
  build: {
    format: "file"
  }
});
