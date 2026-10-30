import { setVideoPlaying } from "./playback"

// Feed links wrap the player in some layouts. Suppress both href hover/status
// and Instagram's click handlers for the fullscreen session, then restore them.
export function observeFullscreenNavigation(doc: Document = document) {
  const links = new Map<HTMLAnchorElement, string>()
  const surfaces = new Set<Element>()
  let source: HTMLVideoElement | null = null
  let observer: MutationObserver | undefined
  const restoreLinks = () => {
    observer?.disconnect()
    observer = undefined
    for (const [anchor, href] of links) {
      if (!anchor.hasAttribute("href")) anchor.setAttribute("href", href)
      anchor.removeAttribute("data-bigv-fullscreen-link")
    }
    links.clear()
    surfaces.forEach((surface) =>
      surface.removeAttribute("data-bigv-fullscreen-surface")
    )
    surfaces.clear()
    source = null
  }
  const isSurface = (target: Element) => {
    if (!source || !doc.fullscreenElement?.contains(target)) return false
    if (target.closest(".bigv-control, [bigv-inject]")) return false
    const control = target.closest(
      'button, input, select, textarea, [role="button"], [role="slider"], [contenteditable="true"]'
    )
    if (control && !control.contains(source)) {
      // Instagram's transparent play overlay can itself be a full-size button.
      if (
        control.matches(
          'input, select, textarea, [role="slider"], [contenteditable="true"]'
        )
      )
        return false
      const rect = control.getBoundingClientRect(),
        video = source.getBoundingClientRect()
      if (rect.width < video.width * 0.9 || rect.height < video.height * 0.9)
        return false
    }
    return true
  }
  const syncLinks = () => {
    if (!source || !doc.fullscreenElement?.contains(source)) return
    const current = new Set<HTMLAnchorElement>()
    for (
      let anchor = source.closest("a");
      anchor;
      anchor = anchor.parentElement?.closest("a") ?? null
    ) {
      current.add(anchor)
      const href = anchor.getAttribute("href")
      if (href !== null) {
        links.set(anchor, href)
        anchor.removeAttribute("href")
      }
      anchor.setAttribute("data-bigv-fullscreen-link", "true")
    }
    for (const [anchor, href] of links) {
      if (current.has(anchor)) continue
      if (!anchor.hasAttribute("href")) anchor.setAttribute("href", href)
      anchor.removeAttribute("data-bigv-fullscreen-link")
      links.delete(anchor)
    }
    const mark = (element: Element) => {
      element.setAttribute("data-bigv-fullscreen-surface", "true")
      surfaces.add(element)
    }
    mark(source)
    for (const element of doc.fullscreenElement.querySelectorAll(
      '[role="button"]'
    )) {
      if (isSurface(element)) mark(element)
    }
  }
  const sync = () => {
    const video =
      doc.querySelector?.<HTMLVideoElement>(
        '[data-bigv-fullscreen-source="true"]'
      ) ?? null
    if (!video || !doc.fullscreenElement?.contains(video)) {
      restoreLinks()
      return
    }
    if (video === source) {
      syncLinks()
      return
    }
    restoreLinks()
    source = video
    syncLinks()
    observer = new MutationObserver(syncLinks)
    observer.observe(doc, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["href"]
    })
  }
  const click = (event: MouseEvent) => {
    if (
      !source ||
      !(event.target instanceof Element) ||
      !isSurface(event.target)
    )
      return
    event.preventDefault()
    event.stopImmediatePropagation()
    if (event.type === "click" && event.button === 0)
      void setVideoPlaying(source, source.paused)
  }
  const keydown = (event: KeyboardEvent) => {
    if (
      event.key !== "Enter" ||
      !source ||
      !(event.target instanceof Element) ||
      !isSurface(event.target)
    )
      return
    event.preventDefault()
    event.stopImmediatePropagation()
    void setVideoPlaying(source, source.paused)
  }
  doc.addEventListener("fullscreenchange", sync)
  doc.addEventListener("click", click, true)
  doc.addEventListener("auxclick", click, true)
  doc.addEventListener("keydown", keydown, true)
  return () => {
    doc.removeEventListener("fullscreenchange", sync)
    doc.removeEventListener("click", click, true)
    doc.removeEventListener("auxclick", click, true)
    doc.removeEventListener("keydown", keydown, true)
    restoreLinks()
  }
}
