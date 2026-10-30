import { defineConfig } from "wxt"
import svgr from "vite-plugin-svgr"

export default defineConfig({
  srcDir: "src",
  modules: ["@wxt-dev/module-react", "@wxt-dev/auto-icons"],
  imports: false,
  autoIcons: { sizes: [16, 32, 48, 64, 128] },
  zip: {
    artifactTemplate: "{{browser}}-{{manifestVersion}}.zip",
    excludeSources: [
      "build/**",
      "out/**",
      "dist/**",
      "outputs/**",
      ".plasmo/**",
      "**/*.tsbuildinfo"
    ]
  },
  manifest: ({ browser }) => ({
    name: "__MSG_appName__",
    description: "__MSG_appDescription__",
    default_locale: "en",
    permissions: ["storage", "scripting"],
    host_permissions: ["https://www.instagram.com/*"],
    ...(browser === "firefox"
      ? {
          browser_specific_settings: {
            gecko: { id: "7f5862eb-3ab3-424c-aa6b-cf9311fba52f@emirkabal.com" }
          }
        }
      : {})
  }),
  vite: () => ({ plugins: [svgr()] })
})
