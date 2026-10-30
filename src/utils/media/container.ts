// Use Instagram's player surface when available, with a local fallback.
export function getVideoContainer(
  video: HTMLVideoElement | HTMLImageElement
): HTMLElement | null {
  const parent = video.parentElement
  if (!parent || /^(BODY|HTML)$/.test(parent.tagName)) return null
  for (let node: HTMLElement | null = parent; node; node = node.parentElement) {
    if (/^(BODY|HTML|ARTICLE|MAIN)$/.test(node.tagName)) break
    if (node.querySelectorAll("video").length !== 1) break
    if (
      Array.from(node.children).some((child) =>
        child.hasAttribute("data-instancekey")
      )
    )
      return node
  }
  return parent
}
const positioned = new WeakMap<
  HTMLElement,
  { count: number; value: string; priority: string }
>()
export function positionVideoContainer(container: HTMLElement) {
  const previous = positioned.get(container)
  if (previous) previous.count++
  else if (getComputedStyle(container).position === "static") {
    positioned.set(container, {
      count: 1,
      value: container.style.getPropertyValue("position"),
      priority: container.style.getPropertyPriority("position")
    })
    container.style.setProperty("position", "relative")
  } else return () => {}
  return () => {
    const snapshot = positioned.get(container)
    if (!snapshot || --snapshot.count > 0) return
    positioned.delete(container)
    if (container.style.position !== "relative") return
    if (snapshot.value)
      container.style.setProperty("position", snapshot.value, snapshot.priority)
    else container.style.removeProperty("position")
  }
}
