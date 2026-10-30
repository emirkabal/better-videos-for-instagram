import { useEffect, useRef, useState } from "react"

import { getVideoContainer } from "@/utils/media/container"

export function usePlayerControls(video: HTMLVideoElement | HTMLImageElement) {
  const controlsRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return
    const surface = getVideoContainer(video)
    let timer: ReturnType<typeof setTimeout> | undefined
    let pointer: { x: number; y: number } | undefined

    const clearTimer = () => {
      clearTimeout(timer)
      timer = undefined
    }
    const isInteracting = () => {
      const volume = controls.querySelector<HTMLElement>(
        ".better-ig-progress-bar-vertical"
      )
      // Firefox can retain :hover on a native range until the next pointer
      // move after releasing its thumb outside the panel.
      const rect = controls.getBoundingClientRect()
      const hovered =
        controls.matches(":hover") &&
        (!pointer ||
          (pointer.x >= rect.left &&
            pointer.x <= rect.right &&
            pointer.y >= rect.top &&
            pointer.y <= rect.bottom))
      return (
        hovered ||
        controls.querySelector(
          ':focus-visible:not([data-bigv-pointer-focus]), [aria-expanded="true"], .baseline.dragging, .better-ig-volume-control.active, input[type="range"]:active'
        ) !== null ||
        Boolean(volume && getComputedStyle(volume).visibility === "visible")
      )
    }
    const hideWhenIdle = () => {
      if (isInteracting()) timer = setTimeout(hideWhenIdle, 150)
      else setVisible(false)
    }
    const show = () => {
      clearTimer()
      setVisible(true)
      timer = setTimeout(hideWhenIdle, 1400)
    }
    const reveal = (event: Event) => {
      if (event instanceof MouseEvent)
        pointer = { x: event.clientX, y: event.clientY }
      show()
    }
    const leave = () => {
      clearTimer()
      timer = setTimeout(hideWhenIdle, 300)
    }
    const reset = () => {
      clearTimer()
      setVisible(false)
    }

    reset()

    const resizeObserver = new ResizeObserver(([entry]) => {
      if (!entry) return
      setCompact(entry.contentRect.width < 320)
    })
    resizeObserver.observe(video)
    // Scrolling a video under a stationary cursor can fire pointerenter.
    // Reveal only on an actual pointer movement or press on the video.
    for (const event of ["pointermove", "pointerdown"])
      surface?.addEventListener(event, reveal)
    surface?.addEventListener("pointerleave", leave)
    for (const event of [
      "pointerenter",
      "pointerup",
      "pointercancel",
      "lostpointercapture",
      "focusin",
      "click"
    ])
      controls.addEventListener(event, reveal)
    controls.addEventListener("pointerleave", leave)
    controls.addEventListener("focusout", leave)
    for (const event of ["loadstart", "emptied", "load"])
      video.addEventListener(event, reset)

    return () => {
      clearTimer()
      resizeObserver.disconnect()
      for (const event of ["pointermove", "pointerdown"])
        surface?.removeEventListener(event, reveal)
      surface?.removeEventListener("pointerleave", leave)
      for (const event of [
        "pointerenter",
        "pointerup",
        "pointercancel",
        "lostpointercapture",
        "focusin",
        "click"
      ])
        controls.removeEventListener(event, reveal)
      controls.removeEventListener("pointerleave", leave)
      controls.removeEventListener("focusout", leave)
      for (const event of ["loadstart", "emptied", "load"])
        video.removeEventListener(event, reset)
    }
  }, [video])

  return { controlsRef, visible, compact }
}
