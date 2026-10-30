import { useId } from "react"
import { useLocalStorage } from "usehooks-ts"

import { t } from "@/utils/i18n"

export default function Autoskip({
  placement = "controls"
}: {
  placement?: "controls" | "dock"
}) {
  const id = useId()
  const [autoSkip, setAutoSkip] = useLocalStorage("bigv-autoskip", false)

  if (placement === "dock")
    return (
      <button
        type="button"
        className="bigv-control bigv-autoskip in-dock"
        aria-label={t("autoskipLabel")}
        title={t("autoskipLabel")}
        aria-pressed={autoSkip}
        onClick={(event) => {
          event.stopPropagation()
          setAutoSkip(!autoSkip)
        }}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 8a8 8 0 0 1 13-2l2 2M20 3v5h-5M19 16a8 8 0 0 1-13 2l-2-2M4 21v-5h5" />
          <path d="m10 8 6 4-6 4Z" />
        </svg>
      </button>
    )

  return (
    <div
      className="bigv-control bigv-autoskip"
      onClick={(event) => event.stopPropagation()}>
      <label className="bigv-switch" title={t("autoskipLabel")}>
        <input
          id={id}
          type="checkbox"
          aria-label={t("autoskipLabel")}
          checked={autoSkip}
          onChange={(event) => setAutoSkip(event.target.checked)}
        />
        <span className="bigv-slider"></span>
      </label>
      {placement === "controls" && (
        <label htmlFor={id} className="bigv-switch-text">
          {t("autoskipLabel")}
        </label>
      )}
    </div>
  )
}
