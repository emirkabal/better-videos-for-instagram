import { useId } from "react"
import { useSetting } from "@/hooks/use-setting"
import { settings } from "@/utils/storage/settings"

import { getUiDirection, t } from "@/utils/i18n"

import "./style.css"

export default function UpdatePreferences({
  floating = false
}: {
  floating?: boolean
}) {
  const id = useId()
  const [enabled, setEnabled] = useSetting(settings.showFeatureUpdates)
  return (
    <section
      className={`bigv-update-preferences ${floating ? "is-floating" : ""}`}
      dir={getUiDirection()}>
      <div>
        <label htmlFor={id}>{t("featureUpdatesLabel")}</label>
        <p id={`${id}-hint`}>{t("featureUpdatesDescription")}</p>
      </div>
      <label className="bigv-update-switch">
        <input
          id={id}
          type="checkbox"
          role="switch"
          aria-describedby={`${id}-hint`}
          checked={enabled}
          onChange={(event) => void setEnabled(event.target.checked)}
        />
        <span aria-hidden="true" />
      </label>
    </section>
  )
}
