import { useEffect, useRef, useState } from "react"

export function useControlsVisibility(video: HTMLVideoElement) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const panel = panelRef.current
    const doc = panel?.ownerDocument
    const ownerWindow = doc?.defaultView
    if (!panel || !doc || !ownerWindow) return
    let timer: number | undefined
    const interacting = () =>
      panel.matches(":hover") ||
      Boolean(
        panel.querySelector(
          ':focus-visible:not([data-bigv-pointer-focus]), [aria-expanded="true"], .baseline.dragging, input[type="range"]:active'
        )
      )
    const clear = () => ownerWindow.clearTimeout(timer)
    const schedule = () => {
      clear()
      if (video.paused || video.ended) return
      timer = ownerWindow.setTimeout(() => {
        if (interacting()) schedule()
        else setVisible(false)
      }, 1800)
    }
    const reveal = () => {
      setVisible(true)
      schedule()
    }
    const leave = () => schedule()
    const blur = () => {
      clear()
      if (!video.paused && !panel.querySelector('.baseline.dragging, input[type="range"]:active'))
        setVisible(false)
    }
    const events = [
      "pointermove",
      "pointerdown",
      "pointerup",
      "pointercancel",
      "keydown",
      "focusin",
      "focusout"
    ]
    events.forEach((event) => doc.addEventListener(event, reveal, true))
    doc.documentElement.addEventListener("pointerleave", leave)
    ownerWindow.addEventListener("blur", blur)
    for (const event of ["play", "pause", "ended"])
      video.addEventListener(event, reveal)
    schedule()
    return () => {
      clear()
      events.forEach((event) => doc.removeEventListener(event, reveal, true))
      doc.documentElement.removeEventListener("pointerleave", leave)
      ownerWindow.removeEventListener("blur", blur)
      for (const event of ["play", "pause", "ended"])
        video.removeEventListener(event, reveal)
    }
  }, [video])

  return { panelRef, visible }
}
