import { useEffect, useRef, useState } from "react"

export function usePlayerControls(video: HTMLVideoElement) {
  const controlsRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return
    const surface =
      video.closest("div:has(>[data-instancekey])") ?? video.parentElement
    let timer: ReturnType<typeof setTimeout> | undefined
    let interacted = false

    const clearTimer = () => {
      clearTimeout(timer)
      timer = undefined
    }
    const isInteracting = () =>
      controls.matches(":hover") ||
      controls.querySelector(
        ':focus-visible:not([data-bigv-pointer-focus]), [aria-expanded="true"], .baseline.dragging'
      ) !== null
    const show = () => {
      clearTimer()
      setVisible(true)
      if (video.paused || video.ended) return
      timer = setTimeout(() => {
        if (!isInteracting()) setVisible(false)
      }, 1400)
    }
    const reveal = () => {
      interacted = true
      show()
    }
    const syncPlayback = () => {
      // Autoplay and scroll-driven pauses must not reveal a newly injected UI.
      if (interacted) show()
    }
    const reset = () => {
      clearTimer()
      interacted = false
      setVisible(false)
    }

    reset()

    const resizeObserver = new ResizeObserver(([entry]) => {
      setCompact(entry.contentRect.width < 320)
    })
    resizeObserver.observe(video)
    // Scrolling a video under a stationary cursor can fire pointerenter.
    // Reveal only on an actual pointer movement or press on the video.
    for (const event of ["pointermove", "pointerdown"])
      surface?.addEventListener(event, reveal)
    for (const event of [
      "pointerenter",
      "pointerleave",
      "pointerup",
      "pointercancel",
      "lostpointercapture",
      "focusin",
      "focusout",
      "click"
    ])
      controls.addEventListener(event, reveal)
    for (const event of ["play", "pause", "ended"])
      video.addEventListener(event, syncPlayback)
    for (const event of ["loadstart", "emptied"])
      video.addEventListener(event, reset)

    return () => {
      clearTimer()
      resizeObserver.disconnect()
      for (const event of ["pointermove", "pointerdown"])
        surface?.removeEventListener(event, reveal)
      for (const event of [
        "pointerenter",
        "pointerleave",
        "pointerup",
        "pointercancel",
        "lostpointercapture",
        "focusin",
        "focusout",
        "click"
      ])
        controls.removeEventListener(event, reveal)
      for (const event of ["play", "pause", "ended"])
        video.removeEventListener(event, syncPlayback)
      for (const event of ["loadstart", "emptied"])
        video.removeEventListener(event, reset)
    }
  }, [video])

  return { controlsRef, visible, compact }
}
