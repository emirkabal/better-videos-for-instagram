export function getReelScroller(video: HTMLVideoElement) {
  const doc = video.ownerDocument
  for (let node = video.parentElement; node; node = node.parentElement) {
    const style = doc.defaultView!.getComputedStyle(node)
    if (
      node.clientHeight > 0 &&
      ((/^(auto|scroll)$/.test(style.overflowY) &&
        node.scrollHeight > node.clientHeight) ||
        style.scrollSnapType.startsWith("y"))
    )
      return node
  }
  return doc.scrollingElement instanceof HTMLElement
    ? doc.scrollingElement
    : null
}

// Keep the requested destination while Instagram appends its next batch. A
// one-shot scroll is clamped at the end of the currently loaded list.
export function navigateReel(
  video: HTMLVideoElement,
  direction: 1 | -1,
  clock: Pick<Window, "setTimeout" | "clearTimeout">,
  refresh: () => void
) {
  const scroller = getReelScroller(video)
  if (!scroller || scroller.clientHeight <= 0) return () => {}
  const destination = Math.max(
    0,
    scroller.scrollTop + direction * scroller.clientHeight
  )
  let attempts = 0
  let cancelled = false
  let timer: number | undefined
  const cancel = () => {
    cancelled = true
    if (timer !== undefined) clock.clearTimeout(timer)
    for (const event of ["wheel", "touchstart", "pointerdown", "keydown"])
      video.ownerDocument.removeEventListener?.(event, cancel, true)
  }
  const step = () => {
    if (cancelled || !scroller.isConnected) return cancel()
    const maximum = Math.max(0, scroller.scrollHeight - scroller.clientHeight)
    const target = Math.min(destination, maximum)
    // Generate a real scroll at a clamped boundary so lazy-load sentinels can
    // be evaluated again, without advancing beyond the requested next Reel.
    const atBoundary = direction === 1 && destination > maximum && maximum > 0
    scroller.scrollTo({
      top: atBoundary && attempts % 2 === 1 ? Math.max(0, target - 1) : target,
      behavior: "instant"
    })
    if (attempts === 0) scroller.dispatchEvent(new Event("scroll"))
    refresh()
    if (
      maximum >= destination &&
      Math.abs(scroller.scrollTop - destination) < 2
    )
      return cancel()
    if (cancelled || ++attempts >= 32) return cancel()
    timer = clock.setTimeout(step, 250)
  }
  // Let the caller retain the cancellation handle before refresh can hand off
  // the current video and cancel this request.
  timer = clock.setTimeout(step, 0)
  for (const event of ["wheel", "touchstart", "pointerdown", "keydown"])
    video.ownerDocument.addEventListener?.(event, cancel, {
      capture: true,
      passive: true
    })
  return cancel
}
