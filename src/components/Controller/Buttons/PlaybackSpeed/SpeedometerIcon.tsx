import type { CSSProperties } from "react"

export default function SpeedometerIcon({
  handStyle
}: {
  handStyle: CSSProperties
}) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M0.7 23A11.3 11.3 0 0 1 12 11.7 11.3 11.3 0 0 1 23.3 23"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M4.4 22.35a.72.72 0 1 1 0-1.44.72.72 0 0 1 0 1.44Z"
        fill="currentColor"
      />
      <path
        d="M19.6 22.35a.72.72 0 1 1 0-1.44.72.72 0 0 1 0 1.44Z"
        fill="currentColor"
      />
      <g style={handStyle}>
        <path
          d="M12 23 12 14.5"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
      </g>
      <circle cx="12" cy="23" r="1.5" fill="currentColor" />
    </svg>
  )
}
