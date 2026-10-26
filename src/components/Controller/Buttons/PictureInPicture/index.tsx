import { useState, useSyncExternalStore } from "react"

import { t } from "~utils/i18n"
import { pictureInPicture } from "~utils/picture-in-picture"

import { renderPipControls } from "../../PipControls"

export default function PictureInPictureButton({
  video,
  followReels = false,
  placement = "dock",
  showLabel = true
}: {
  video: HTMLVideoElement
  followReels?: boolean
  placement?: "dock" | "controls"
  showLabel?: boolean
}) {
  const active = useSyncExternalStore(
    pictureInPicture.subscribe,
    pictureInPicture.getSnapshot
  )
  const pending = useSyncExternalStore(
    pictureInPicture.subscribe,
    pictureInPicture.getPending
  )
  const [error, setError] = useState(false)
  if (!pictureInPicture.supported(video)) return null
  const label = t(active ? "exitPipLabel" : "pipLabel")
  return (
    <div
      className={`bigv-pip-control bigv-control ${placement === "controls" ? "in-controls" : ""}`}>
      <button
        type="button"
        className="bigv-pip-button bigv-control"
        aria-label={label}
        aria-pressed={active}
        title={error ? t("pipErrorLabel") : label}
        disabled={pending}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setError(false)
          pictureInPicture.setControlsRenderer(renderPipControls)
          void pictureInPicture
            .toggle(video, followReels)
            .catch(() => setError(true))
        }}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <rect
            x="12"
            y="12"
            width="7"
            height="6"
            rx="1"
            fill="currentColor"
            stroke="none"
          />
        </svg>
      </button>
      {placement === "controls" && showLabel && (
        <span className="bigv-switch-text">PiP</span>
      )}
      {error && (
        <span className="bigv-control-error" role="status">
          {t("pipErrorLabel")}
        </span>
      )}
    </div>
  )
}
