import icon from "url:~/assets/icon.png"

import { version } from "../../package.json"

import "./welcome.css"

export default function Welcome() {
  const isUpdate =
    new URLSearchParams(window.location.search).get("reason") === "update"

  return (
    <main className="page">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Back to top">
          <img src={icon} alt="" />

          <span className="brand-name">Better Videos for Instagram</span>

          <span className="version">v{version}</span>
        </a>

        <a
          className="github-link"
          href="https://github.com/emirkabal/better-instagram-videos"
          target="_blank"
          rel="noreferrer">
          GitHub
          <span aria-hidden="true">↗</span>
        </a>
      </header>

      <section className="hero" id="top">
        <div className="status">
          <span className="status-dot" />
          {isUpdate ? "Updated successfully" : "Installed successfully"}
        </div>

        <h1>
          Better controls for
          <span> Instagram videos.</span>
        </h1>

        <p className="hero-copy">
          Precise seeking, remembered volume, fullscreen playback, autoskip and
          better controls across Instagram videos.
        </p>

        <div className="actions">
          <a
            className="primary-action"
            href="https://www.instagram.com/"
            target="_blank"
            rel="noreferrer">
            Open Instagram
            <span aria-hidden="true">↗</span>
          </a>

          <a
            className="coffee-action"
            href="https://buymeacoffee.com/emirkabal"
            target="_blank"
            rel="noreferrer">
            <span aria-hidden="true">☕</span>
            Support the project
          </a>
        </div>
      </section>

      <section className="setup">
        <div className="setup-copy">
          <span className="setup-label">Ready to go</span>

          <h2>No setup required.</h2>

          <p>
            Open Instagram and play a video. Better Videos automatically adds
            the improved controls wherever they are supported.
          </p>
        </div>

        <div className="setup-card">
          <div className="setup-row">
            <span>01</span>

            <div>
              <strong>Open Instagram</strong>
              <p>Visit any page with a supported video.</p>
            </div>
          </div>

          <div className="setup-row">
            <span>02</span>

            <div>
              <strong>Play a video</strong>
              <p>The improved controls appear automatically.</p>
            </div>
          </div>

          <div className="setup-row">
            <span>03</span>

            <div>
              <strong>Adjust preferences</strong>
              <p>
                Use the extension icon whenever you want to change its settings.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <span>Better Videos for Instagram </span>

        <span>
          Built by{" "}
          <a href="https://emirkabal.com" target="_blank" rel="noreferrer">
            Emir Kabal
          </a>
        </span>
      </footer>
    </main>
  )
}
