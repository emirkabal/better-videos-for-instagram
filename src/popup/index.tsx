import icon from "url:~/assets/icon.png"

import { useStorage } from "@plasmohq/storage/hook"

import {
  CLICK_TO_PAUSE_STORAGE_KEY,
  CONTROLLER_ENABLED_STORAGE_KEY,
  UNINSTALL_FEEDBACK_URL
} from "~utils/constants"
import { getUiDirection, t } from "~utils/i18n"

import { version } from "../../package.json"

import "./style.css"

export default function Popup() {
  const [controllerEnabled, setControllerEnabled] = useStorage<boolean>(
    CONTROLLER_ENABLED_STORAGE_KEY,
    (stored) => stored ?? true
  )

  const [pauseOnComments, setPauseOnComments] = useStorage(
    "bigv-pause-on-comments",
    true
  )

  const [clickToPause, setClickToPause] = useStorage<boolean>(
    CLICK_TO_PAUSE_STORAGE_KEY,
    (stored) => stored ?? true
  )

  const [volumeReduction, setVolumeReduction] = useStorage(
    "bigv-max-volume-balance",
    100
  )

  return (
    <main
      className="popup"
      dir={getUiDirection()}
      lang={chrome.i18n.getUILanguage?.() || "en"}>
      <header className="header">
        <div className="brand">
          <img src={icon} alt="" />

          <div>
            <strong>Better Videos</strong>
            <span>v{version}</span>
          </div>
        </div>

        <a
          href="https://github.com/emirkabal/better-instagram-videos"
          target="_blank"
          rel="noreferrer"
          className="github">
          GitHub ↗
        </a>
      </header>

      <section className="controller">
        <div>
          <div className="controller-title">
            <span
              className={`status-dot ${controllerEnabled ? "enabled" : ""}`}
            />
            <strong>
              {t(
                controllerEnabled
                  ? "extensionEnabledLabel"
                  : "extensionPausedLabel"
              )}
            </strong>
          </div>

          <p>
            {t(
              controllerEnabled
                ? "extensionEnabledDescription"
                : "extensionPausedDescription"
            )}
          </p>
        </div>

        <button
          type="button"
          className="switch"
          role="switch"
          aria-checked={controllerEnabled}
          aria-label={t(
            controllerEnabled
              ? "disableControllerLabel"
              : "enableControllerLabel"
          )}
          onClick={() => void setControllerEnabled(!controllerEnabled)}>
          <span />
        </button>
      </section>

      <fieldset className="settings" disabled={!controllerEnabled}>
        <legend>{t("settingsLabel")}</legend>

        <div className="setting">
          <div>
            <strong>{t("clickToPauseLabel")}</strong>
            <span>{t("clickToPauseDescription")}</span>
          </div>

          <label className="small-switch">
            <input
              type="checkbox"
              aria-label={t("clickToPauseDescription")}
              checked={clickToPause}
              onChange={(event) => void setClickToPause(event.target.checked)}
            />
            <span />
          </label>
        </div>

        <div className="setting">
          <div>
            <strong>{t("volumeReductionLabel")}</strong>
            <span>{t("volumeReductionDescription")}</span>
          </div>

          <div className="volume-options">
            {[100, 350, 650].map((value) => (
              <label key={value}>
                <input
                  type="radio"
                  name="volumeReduction"
                  value={value}
                  checked={volumeReduction === value}
                  onChange={(event) =>
                    void setVolumeReduction(Number(event.target.value))
                  }
                />
                <span>
                  {value === 100 ? (
                    t("offLabel")
                  ) : (
                    <bdi dir="ltr">÷{value / 100}</bdi>
                  )}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="setting">
          <div>
            <strong>{t("pauseAutoskipLabel")}</strong>
            <span>{t("pauseAutoskipDescription")}</span>
          </div>

          <label className="small-switch">
            <input
              type="checkbox"
              aria-label={`${t("pauseAutoskipLabel")}: ${t("pauseAutoskipDescription")}`}
              checked={pauseOnComments}
              onChange={(event) =>
                void setPauseOnComments(event.target.checked)
              }
            />
            <span />
          </label>
        </div>
      </fieldset>

      <a
        className="coffee"
        href="https://buymeacoffee.com/emirkabal"
        target="_blank"
        rel="noreferrer">
        <span>☕</span>
        {t("supportProjectLabel")}
      </a>

      <footer>
        <nav>
          <a href={UNINSTALL_FEEDBACK_URL} target="_blank" rel="noreferrer">
            {t("reportBugLabel")}
          </a>

          <span>·</span>

          <a href="mailto:me@emirkabal.com">{t("contactLabel")}</a>
        </nav>

        <a
          className="author"
          href="https://emirkabal.com"
          target="_blank"
          rel="noreferrer">
          Emir Kabal
        </a>
      </footer>
    </main>
  )
}
