import { useState } from "react"
import icon from "@/assets/icon.png?url"

import { useSetting } from "@/hooks/use-setting"
import { settings } from "@/utils/storage/settings"
import UpdatePreferences from "@/components/UpdatePreferences"
import { useClickMode } from "@/hooks/use-click-mode"
import { CLICK_MODES } from "@/utils/playback/click-mode"

import { UNINSTALL_FEEDBACK_URL } from "@/utils/constants"
import { getUiDirection, t } from "@/utils/i18n"

import { version } from "../../../package.json"

import "./style.css"

export default function Popup() {
  const [diagnostics, setDiagnostics] = useState("")
  const [diagnosticStatus, setDiagnosticStatus] = useState("")
  const [checking, setChecking] = useState(false)
  const [needsReload, setNeedsReload] = useState(false)
  const inspectPage = async () => {
    setChecking(true)
    setNeedsReload(false)
    setDiagnostics("")
    setDiagnosticStatus("")
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      })
      if (!tab?.id || !tab.url?.startsWith("https://www.instagram.com/")) {
        setDiagnosticStatus(t("diagnosticsOpenInstagram"))
        return
      }
      const result = await Promise.race([
        chrome.tabs.sendMessage(tab.id, { type: "bigv-diagnostics" }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("timeout")), 2500)
        })
      ])
      if (!result || typeof result.controllers !== "number")
        throw new Error("unavailable")
      setDiagnostics(
        JSON.stringify({ ...result, browser: navigator.userAgent }, null, 2)
      )
      setDiagnosticStatus(
        t(result.controllers > 0 ? "diagnosticsReady" : "diagnosticsNoControls")
      )
    } catch {
      setDiagnosticStatus(t("diagnosticsReload"))
      setNeedsReload(true)
    } finally {
      if (timer) clearTimeout(timer)
      setChecking(false)
    }
  }
  const [controllerEnabled, setControllerEnabled] = useSetting(
    settings.controllerEnabled
  )

  const [pauseOnComments, setPauseOnComments] = useSetting(
    settings.pauseOnComments
  )

  const [clickMode, setClickMode] = useClickMode()
  const modeLabels = {
    native: "clickModeNative",
    pause: "clickModePause",
    "pause-reels": "clickModePauseReels"
  } as const
  const modeDescriptions = {
    native: "clickModeNativeDescription",
    pause: "clickModePauseDescription",
    "pause-reels": "clickModePauseReelsDescription"
  } as const

  const [volumeReduction, setVolumeReduction] = useSetting(
    settings.maxVolumeBalance
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

        <fieldset className="click-mode-setting">
          <legend>{t("clickBehaviorLabel")}</legend>
          <div className="click-mode-options">
            {CLICK_MODES.map((mode) => (
              <label key={mode}>
                <input
                  type="radio"
                  name="click-mode"
                  value={mode}
                  checked={clickMode === mode}
                  onChange={() => void setClickMode(mode)}
                  aria-describedby="click-mode-hint"
                />
                <span>{t(modeLabels[mode])}</span>
              </label>
            ))}
          </div>
          <p id="click-mode-hint">{t(modeDescriptions[clickMode])}</p>
        </fieldset>

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
      <UpdatePreferences />
      <details className="keyboard-shortcuts">
        <summary>{t("keyboardShortcutsLabel")}</summary>
        <dl>
          {(
            [
              [["K"], "playPauseShortcutLabel"],
              [["←", "→"], "seek5ShortcutLabel"],
              [["J", "L"], "seek10ShortcutLabel"],
              [["+", "−"], "volumeShortcutLabel"],
              [["M"], "muteShortcutLabel"]
            ] as const
          ).map(([keys, label]) => (
            <div key={label}>
              <dt>
                {keys.map((key) => (
                  <kbd key={key}>{key}</kbd>
                ))}
              </dt>
              <dd>{t(label)}</dd>
            </div>
          ))}
        </dl>
        <p>{t("keyboardShortcutsHint")}</p>
      </details>

      <a
        className="coffee"
        href="https://buymeacoffee.com/emirkabal"
        target="_blank"
        rel="noreferrer">
        <span>☕</span>
        {t("supportProjectLabel")}
      </a>

      <details
        className="diagnostics"
        onToggle={(event) => {
          if (event.currentTarget.open) void inspectPage()
        }}>
        <summary>{t("diagnosticsLabel")}</summary>
        <p role="status">{diagnosticStatus}</p>
        {diagnostics && (
          <textarea
            aria-label={t("diagnosticsLabel")}
            readOnly
            value={diagnostics}
            rows={9}
          />
        )}
        <button
          type="button"
          disabled={checking}
          onClick={() => void inspectPage()}>
          {t("diagnosticsCheck")}
        </button>
        {needsReload && (
          <button
            type="button"
            onClick={async () => {
              const [tab] = await chrome.tabs.query({
                active: true,
                currentWindow: true
              })
              if (tab?.id && tab.url?.startsWith("https://www.instagram.com/"))
                await chrome.tabs.reload(tab.id)
            }}>
            {t("diagnosticsReloadButton")}
          </button>
        )}
      </details>

      <footer>
        <nav>
          <a
            href={chrome.runtime.getURL("welcome.html?reason=update")}
            target="_blank"
            rel="noreferrer">
            {t("whatsNewLabel")}
          </a>
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
