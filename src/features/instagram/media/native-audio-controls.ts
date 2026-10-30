// Match audio actions rather than all Instagram overlay buttons. Tags, captions,
// soundtrack links and navigation must keep their native behavior.
export function isNativeAudioControl(control: Element) {
  if (
    control.closest("[data-bigv-controller], .bigv-control") ||
    control.querySelector("video")
  )
    return false
  const labels = [
    control,
    ...control.querySelectorAll("svg, [aria-label], title")
  ]
    .flatMap((node) => [
      node.getAttribute("aria-label"),
      node.getAttribute("title"),
      node.tagName.toLowerCase() === "title" ? node.textContent : null
    ])
    .filter(Boolean)
  return (
    labels.some((label) =>
      /^(?:unmute|mute|toggle (?:audio|sound)|turn (?:sound|audio) (?:on|off)|(?:audio|sound)(?: is)? (?:muted|unmuted|playing|on|off)|(?:adjust )?volume(?: (?:on|off))?|sesi (?:aç|kapat)|ses (?:açık|kapalı)|activer le son|désactiver le son|ton (?:ein|aus)|stummschalten|stumm(?:schaltung)? aufheben|activar (?:el )?sonido|silenciar|включить звук|выключить звук|كتم الصوت|إلغاء كتم الصوت|تشغيل الصوت)[.!]?$/iu.test(
        label!.trim()
      )
    ) ||
    // Fingerprint observed on the live Instagram muted-speaker icon. This
    // also recognizes that icon with localized or missing accessible labels.
    Array.from(control.querySelectorAll('svg[viewBox="0 0 48 48"] path')).some(
      (path) => {
        const shape = (path.getAttribute("d") ?? "").replace(/\s+/g, " ")
        return (
          shape.startsWith("M1.5 13.3c-.8 0-1.5.7-1.5 1.5v18.4") &&
          shape.includes("m46.8 31.4-5.5-5.5")
        )
      }
    ) ||
    /(?:^|[-_])(?:mute|unmute|audio-toggle|volume-control)(?:[-_]|$)/i.test(
      control.getAttribute("data-testid") ?? ""
    )
  )
}

export function getAudioScope(video: HTMLVideoElement) {
  let scope = video.parentElement
  // Live Reels have at least eight wrappers between video and audio overlay.
  // Follow the single-video boundary, not an assumed number of DOM wrappers.
  for (let i = 0; i < 32 && scope?.parentElement; i++) {
    const parent = scope.parentElement
    if (
      /^(BODY|HTML|MAIN)$/.test(parent.tagName) ||
      parent.getAttribute("role") === "main" ||
      parent.querySelectorAll("video").length !== 1
    )
      break
    scope = parent
    if (parent.tagName === "ARTICLE") break
  }
  return scope
}

// Only explicit use of a native audio control may update saved preferences.
// Autoplay's volumechange events are not a user's mute/unmute choice.
export function observeNativeAudioIntent(
  video: HTMLVideoElement,
  onChange: () => void,
  onStart: () => void
) {
  const doc = video.ownerDocument
  let timer: ReturnType<typeof setTimeout> | undefined
  const intent = (event: Event) => {
    const target = event.target as Element | null
    const control = target?.closest?.(
      'button, [role="button"], [role="slider"], input[type="range"]'
    )
    if (
      !event.isTrusted ||
      !control ||
      !isNativeAudioControl(control) ||
      !getAudioScope(video)?.contains(control)
    )
      return
    clearTimeout(timer)
    onStart()
    // Read after Instagram's own handler, before treating autoplay as a setting.
    timer = setTimeout(onChange, 0)
  }
  const events = ["click", "keyup", "input"]
  events.forEach((event) => doc.addEventListener(event, intent, true))
  return () => {
    clearTimeout(timer)
    events.forEach((event) => doc.removeEventListener(event, intent, true))
  }
}

export function hideNativeVideoAudio(video: HTMLVideoElement) {
  const scope = getAudioScope(video)
  if (!scope) return () => {}
  const hidden = new Map<HTMLElement, () => void>()
  const scan = () => {
    for (const control of scope.querySelectorAll<HTMLElement>(
      'button, [role="button"], [role="slider"], input[type="range"]'
    )) {
      if (
        control.contains(video) ||
        !isNativeAudioControl(control) ||
        hidden.has(control)
      )
        continue
      const visibility = control.style.getPropertyValue("visibility")
      const priority = control.style.getPropertyPriority("visibility")
      const display = control.style.getPropertyValue("display")
      const displayPriority = control.style.getPropertyPriority("display")
      const ariaHidden = control.getAttribute("aria-hidden")
      const tabIndex = control.getAttribute("tabindex")
      control.style.setProperty("visibility", "hidden", "important")
      control.style.setProperty("display", "none", "important")
      control.setAttribute("aria-hidden", "true")
      control.setAttribute("tabindex", "-1")
      hidden.set(control, () => {
        if (display)
          control.style.setProperty("display", display, displayPriority)
        else control.style.removeProperty("display")
        if (visibility)
          control.style.setProperty("visibility", visibility, priority)
        else control.style.removeProperty("visibility")
        if (ariaHidden === null) control.removeAttribute("aria-hidden")
        else control.setAttribute("aria-hidden", ariaHidden)
        if (tabIndex === null) control.removeAttribute("tabindex")
        else control.setAttribute("tabindex", tabIndex)
      })
    }
    // A reused button might now be a different action; restore it immediately.
    for (const [control, restore] of hidden) {
      if (!scope.contains(control) || !isNativeAudioControl(control)) {
        restore()
        hidden.delete(control)
      }
    }
  }
  scan()
  const observer = new MutationObserver(scan)
  observer.observe(scope, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["aria-label", "title", "data-testid", "d"]
  })
  return () => {
    observer.disconnect()
    hidden.forEach((restore) => restore())
    hidden.clear()
  }
}
