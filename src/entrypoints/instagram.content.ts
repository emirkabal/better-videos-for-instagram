import { defineContentScript } from "wxt/utils/define-content-script"
import { startInstagram } from "@/features/instagram/runtime"

export default defineContentScript({
  matches: ["https://www.instagram.com/*"],
  runAt: "document_idle",
  main(ctx) {
    ctx.onInvalidated(startInstagram())
  }
})
