import { useId } from "react"
import { useLocalStorage } from "usehooks-ts"

export default function Autoskip() {
  const id = useId()
  const [autoSkip, setAutoSkip] = useLocalStorage("bigv-autoskip", false)

  return (
    <div>
      <label className="bigv-switch">
        <input
          id={id}
          type="checkbox"
          checked={autoSkip}
          onChange={() => setAutoSkip(!autoSkip)}
        />
        <span className="bigv-slider"></span>
      </label>
      <label htmlFor={id} className="bigv-switch-text">
        {chrome.i18n.getMessage("autoskipLabel")}
      </label>
    </div>
  )
}
