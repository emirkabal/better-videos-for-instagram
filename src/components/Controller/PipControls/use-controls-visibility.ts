import { useEffect, useRef, useState } from "react"

export function useControlsVisibility(video: HTMLVideoElement | null) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const panel = panelRef.current
    const doc = panel?.ownerDocument
    const ownerWindow = doc?.defaultView
    if (!panel || !doc || !ownerWindow) return
    let timer: number | undefined
    let pointer: { x: number; y: number } | undefined
    const interacting = () => {
      const rect = panel.getBoundingClientRect()
      const hovered =
        panel.matches(":hover") &&
        (!pointer ||
          (pointer.x >= rect.left &&
            pointer.x <= rect.right &&
            pointer.y >= rect.top &&
            pointer.y <= rect.bottom))
      return (
        hovered ||
        Boolean(
          panel.querySelector(
            ':focus-visible:not([data-bigv-pointer-focus]), [aria-expanded="true"], .baseline.dragging, input[type="range"]:active'
          )
        )
      )
    }
    const clear = () => ownerWindow.clearTimeout(timer)
    const schedule = () => {
      clear()
      if (video?.paused || video?.ended) return
      timer = ownerWindow.setTimeout(() => {
        if (interacting()) schedule()
        else setVisible(false)
      }, 1800)
    }
    const reveal = (event?: Event) => {
      // PiP events belong to another window's realm.
      if (event && "clientX" in event && "clientY" in event)
        pointer = { x: Number(event.clientX), y: Number(event.clientY) }
      setVisible(true)
      schedule()
    }
    const leave = () => schedule()
    const blur = () => {
      clear()
      if (
        !video?.paused &&
        !panel.querySelector('.baseline.dragging, input[type="range"]:active')
      )
        setVisible(false)
    }
    const focus = () => {
      if (panel.querySelector(":focus-visible:not([data-bigv-pointer-focus])"))
        reveal()
    }
    const events = [
      "pointermove",
      "pointerdown",
      "pointerup",
      "pointercancel",
      "keydown"
    ]
    events.forEach((event) => doc.addEventListener(event, reveal, true))
    doc.addEventListener("focusin", focus, true)
    doc.addEventListener("focusout", leave, true)
    doc.documentElement.addEventListener("pointerleave", leave)
    ownerWindow.addEventListener("blur", blur)
    for (const event of ["play", "pause", "ended"])
      video?.addEventListener(event, schedule)
    schedule()
    return () => {
      clear()
      events.forEach((event) => doc.removeEventListener(event, reveal, true))
      doc.removeEventListener("focusin", focus, true)
      doc.removeEventListener("focusout", leave, true)
      doc.documentElement.removeEventListener("pointerleave", leave)
      ownerWindow.removeEventListener("blur", blur)
      for (const event of ["play", "pause", "ended"])
        video?.removeEventListener(event, schedule)
    }
  }, [video])

  return { panelRef, visible }
}
