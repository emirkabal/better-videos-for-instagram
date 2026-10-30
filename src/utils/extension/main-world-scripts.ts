// Dynamic registration preserves document_start + MAIN in Firefox MV2 too.
// Injecting an unlisted script from an isolated content script would be too late
// to capture Instagram's native fetch and media methods reliably.
export async function registerMainWorldScripts(api: typeof chrome.scripting) {
  const existing = await api.getRegisteredContentScripts()
  const legacyIds = [
    "srcContentsInstagramPipMain",
    "srcContentsInstagramSpritesheetMain",
    "bigv-native-controls-main"
  ]
  const stale = existing.filter((script) => legacyIds.includes(script.id))
  if (stale.length) {
    await api.unregisterContentScripts({
      ids: stale.map((script) => script.id)
    })
  }
  const scripts: chrome.scripting.RegisteredContentScript[] = [
    { id: "bigv-pip-main", js: ["instagram-pip-main.js"] },
    { id: "bigv-spritesheet-main", js: ["instagram-spritesheet-main.js"] }
  ].map((script) => ({
    ...script,
    matches: ["https://www.instagram.com/*"],
    runAt: "document_start",
    world: "MAIN",
    persistAcrossSessions: true
  }))
  const current = new Set(existing.map((script) => script.id))
  const updates = scripts.filter((script) => current.has(script.id))
  const additions = scripts.filter((script) => !current.has(script.id))
  if (updates.length) await api.updateContentScripts(updates)
  if (additions.length) await api.registerContentScripts(additions)
}
