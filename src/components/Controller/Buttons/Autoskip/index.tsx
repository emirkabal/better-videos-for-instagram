import { useId } from "react"
import { useLocalStorage } from "usehooks-ts"

import { t } from "~utils/i18n"

export default function Autoskip({
  placement = "controls"
}: {
  placement?: "controls" | "dock"
}) {
  const id = useId()
  const [autoSkip, setAutoSkip] = useLocalStorage("bigv-autoskip", false)

  return (
    <div
      className={`bigv-control bigv-autoskip ${placement === "dock" ? "in-dock" : ""}`}
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
