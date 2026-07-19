import cn from "classnames"

import "./style.css"

import { useEffect, useRef, useState } from "react"

import type { Variant } from "~modules/Injector"

type Props = {
  children: React.ReactNode
  dragging?: boolean
  variant?: Variant
}

export default function SmartContainer({ children, dragging, variant }: Props) {
  const [active, setActive] = useState(false)
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearLeaveTimer = () => {
    if (!leaveTimerRef.current) return

    clearTimeout(leaveTimerRef.current)
    leaveTimerRef.current = null
  }

  const handleMouseEnter = () => {
    clearLeaveTimer()
    setActive(true)
  }

  const handleMouseLeave = () => {
    clearLeaveTimer()
    leaveTimerRef.current = setTimeout(() => {
      setActive(false)
      leaveTimerRef.current = null
    }, 700)
  }

  useEffect(() => {
    return clearLeaveTimer
  }, [])

  return (
    <div
      className={cn(
        "better-ig-volume-control",
        {
          active: dragging || active
        },
        variant
      )}
      onClick={(event) => {
        event.stopPropagation()
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}>
      <div className="content">{children}</div>
    </div>
  )
}
