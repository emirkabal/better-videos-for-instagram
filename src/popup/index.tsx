import icon from "url:~/assets/icon.png"

import { useStorage } from "@plasmohq/storage/hook"

import {
  CONTROLLER_ENABLED_STORAGE_KEY,
  UNINSTALL_FEEDBACK_URL
} from "~utils/constants"

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

  const [volumeReduction, setVolumeReduction] = useStorage(
    "bigv-max-volume-balance",
    100
  )

  const [playbackSpeed, setPlaybackSpeed] = useStorage<number>(
    "bigv-playback-speed",
    1
  )

  return (
    <main className="popup">
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
              {controllerEnabled ? "Extension enabled" : "Extension paused"}
            </strong>
          </div>

          <p>
            {controllerEnabled
              ? "Better controls are active on Instagram."
              : "Instagram will use its default video controls."}
          </p>
        </div>

        <button
          type="button"
          className="switch"
          role="switch"
          aria-checked={controllerEnabled}
          aria-label={`${controllerEnabled ? "Disable" : "Enable"} controller`}
          onClick={() => void setControllerEnabled(!controllerEnabled)}>
          <span />
        </button>
      </section>

      <fieldset className="settings" disabled={!controllerEnabled}>
        <legend>Settings</legend>

        <div className="setting">
          <div>
            <strong>Max volume</strong>
            <span>Boost quieter videos</span>
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
                <span>{value === 100 ? "1×" : `${value / 100}×`}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="setting">
          <div>
            <strong>Playback speed</strong>
            <span>Default video speed</span>
          </div>

          <div className="volume-options speed-options">
            {[0.5, 1, 1.25, 1.5, 2].map((value) => (
              <label key={value}>
                <input
                  type="radio"
                  name="playbackSpeed"
                  value={value}
                  checked={playbackSpeed === value}
                  onChange={(event) =>
                    void setPlaybackSpeed(Number(event.target.value))
                  }
                />
                <span>{value}×</span>
              </label>
            ))}
          </div>
        </div>

        <div className="setting">
          <div>
            <strong>Pause auto-skip</strong>
            <span>While Reel comments are open</span>
          </div>

          <label className="small-switch">
            <input
              type="checkbox"
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
        Support the project
      </a>

      <footer>
        <nav>
          <a href={UNINSTALL_FEEDBACK_URL} target="_blank" rel="noreferrer">
            Report a bug
          </a>

          <span>·</span>

          <a href="mailto:me@emirkabal.com">Contact</a>
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
