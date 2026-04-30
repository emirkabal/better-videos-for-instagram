import { useStorage } from "@plasmohq/storage/hook"

import { version } from "../../package.json"

import "./style.css"

export default function Popup() {
  const [pauseOnComments, setPauseOnComments] = useStorage(
    "bigv-pause-on-comments",
    true
  )
  const [volumeReduction, setVolumeReduction] = useStorage(
    "bigv-max-volume-balance",
    100
  )
  const [showStoryViewIndicator, setShowStoryViewIndicator] = useStorage(
    "bigv-show-story-view-indicator",
    true
  )
  const [openExternalReelsAsPosts, setOpenExternalReelsAsPosts] = useStorage(
    "bigv-open-external-reels-as-posts",
    false
  )

  const getReductionLabel = (value: number) => {
    if (value === 100) return "No reduction"

    return `+${value - 100}% reduction`
  }

  return (
    <div className="better-ig-popup">
      <header>
        <h1>Better Videos for Instagram</h1>
        <span className="version">v{version}</span>
      </header>

      <div className="settings-group">
        <div className="settings-category">
          <h2>General</h2>
          <div className="setting-item">
            <span>Max. Volume Balance</span>
            <div className="volume-options">
              {[100, 350, 650].map((value) => (
                <label key={value} title={getReductionLabel(value)}>
                  <input
                    type="radio"
                    name="volumeReduction"
                    value={value}
                    checked={volumeReduction === value}
                    onChange={(e) => setVolumeReduction(Number(e.target.value))}
                  />
                  <span>{value === 100 ? "Normal" : `${value - 100}%`}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="settings-category">
          <h2>Reels</h2>
          <div className="setting-item checkbox">
            <span>Pause auto-skip when comments are opened</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={pauseOnComments}
                onChange={(e) => setPauseOnComments(e.target.checked)}
              />
              <span className="slider">{}</span>
            </label>
          </div>
          <div className="setting-item checkbox">
            <span>Open external Reels links as posts</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={openExternalReelsAsPosts}
                onChange={(e) => setOpenExternalReelsAsPosts(e.target.checked)}
              />
              <span className="slider">{}</span>
            </label>
          </div>
        </div>

        <div className="settings-category">
          <h2>Stories</h2>
          <div className="setting-item checkbox">
            <span>Show story count indicator</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={showStoryViewIndicator}
                onChange={(e) => setShowStoryViewIndicator(e.target.checked)}
              />
              <span className="slider">{}</span>
            </label>
          </div>
        </div>
      </div>

      <footer>
        <a
          href="https://github.com/emirkabal/better-instagram-videos"
          target="_blank"
          rel="noopener noreferrer"
          className="github-button">
          <svg height="24" viewBox="0 0 16 16" width="24">
            <path
              fill="currentColor"
              d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path>
          </svg>
        </a>
        <a
          href="https://buymeacoffee.com/emirkabal"
          target="_blank"
          rel="noopener noreferrer"
          className="coffee-button">
          <img
            src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
            alt="Buy Me A Coffee"
          />
        </a>
      </footer>
    </div>
  )
}
