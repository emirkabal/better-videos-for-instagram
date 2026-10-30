import { useEffect, useRef, useState } from "react"
import icon from "@/assets/icon.png?url"
import UpdatePreferences from "@/components/UpdatePreferences"

import { version } from "../../../package.json"
import { welcomeCopy as copy } from "./welcome-copy"
import WelcomePreview, { type DemoMode } from "./welcome-preview"

import "./welcome.css"

const chapters = [
  {
    mode: "feed",
    title: copy.feedTitle,
    body: copy.feedBody,
    note: copy.feedNote
  },
  { mode: "pip", title: copy.pipTitle, body: copy.pipBody, note: copy.pipNote },
  {
    mode: "seek",
    title: copy.seekTitle,
    body: copy.seekBody,
    note: copy.seekNote
  },
  {
    mode: "stories",
    title: copy.storiesTitle,
    body: copy.storiesBody,
    note: copy.storiesNote
  }
] satisfies { mode: DemoMode; title: string; body: string; note: string }[]

export default function Welcome() {
  const [mode, setMode] = useState<DemoMode>("feed")
  const chaptersRef = useRef<HTMLDivElement>(null)
  const isUpdate =
    new URLSearchParams(window.location.search).get("reason") === "update"

  useEffect(() => {
    document.documentElement.classList.add("bigv-welcome-document")
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting)
            setMode((entry.target as HTMLElement).dataset.mode as DemoMode)
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    )
    chaptersRef.current
      ?.querySelectorAll("[data-mode]")
      .forEach((chapter) => observer.observe(chapter))
    return () => {
      observer.disconnect()
      document.documentElement.classList.remove("bigv-welcome-document")
    }
  }, [])

  return (
    <div
      className="welcome-page"
      lang={chrome.i18n.getUILanguage().startsWith("tr") ? "tr" : "en"}>
      <header className="welcome-nav">
        <a
          className="welcome-brand"
          href="#top"
          aria-label="Better Videos for Instagram">
          <img src={icon} alt="" width="28" height="28" />
          <span>
            Better Videos{" "}
            <span className="welcome-brand-detail">for Instagram</span>
          </span>
        </a>
        <a
          className="welcome-nav-open"
          href="https://www.instagram.com/"
          target="_blank"
          rel="noreferrer">
          {copy.open}
        </a>
      </header>
      <UpdatePreferences floating />

      <main id="top">
        <section className="welcome-hero" aria-labelledby="welcome-title">
          <p className="welcome-version">
            {isUpdate ? copy.updated : copy.installed} <span>v{version}</span>
          </p>
          <h1 id="welcome-title">{copy.title}</h1>
          <p className="welcome-intro">{copy.intro}</p>
          <a className="welcome-explore" href="#feed">
            {copy.explore}
            <span aria-hidden="true">↓</span>
          </a>
        </section>

        <div className="welcome-showcase">
          <div className="welcome-stage">
            <nav className="welcome-chapter-nav" aria-label={copy.explore}>
              {chapters.map(({ mode: value }) => (
                <a
                  key={value}
                  href={`#${value}`}
                  aria-current={mode === value ? "step" : undefined}
                  onClick={() => setMode(value)}>
                  {value === "pip" ? "PiP" : copy[value]}
                </a>
              ))}
            </nav>
            <WelcomePreview copy={copy} mode={mode} />
            <p className="welcome-demo-note">{copy.demoNote}</p>
          </div>
          <div className="welcome-chapters" ref={chaptersRef}>
            {chapters.map((chapter) => (
              <section
                id={chapter.mode}
                data-mode={chapter.mode}
                className="welcome-chapter"
                key={chapter.mode}
                aria-labelledby={`${chapter.mode}-title`}>
                <p className="welcome-chapter-label">{copy[chapter.mode]}</p>
                <h2 id={`${chapter.mode}-title`}>{chapter.title}</h2>
                <p className="welcome-chapter-body">{chapter.body}</p>
                <p className="welcome-chapter-note">{chapter.note}</p>
              </section>
            ))}
          </div>
        </div>

        <section className="welcome-details" aria-labelledby="details-title">
          <h2 id="details-title">{copy.detailsTitle}</h2>
          <div className="welcome-details-grid">
            {[
              {
                sample: "0.25 - 2×",
                title: copy.speedTitle,
                body: copy.speedBody
              },
              {
                sample: "0 - 100%",
                title: copy.volumeTitle,
                body: copy.volumeBody
              },
              {
                sample: "Auto-skip",
                title: copy.skipTitle,
                body: copy.skipBody
              }
            ].map((item) => (
              <article key={item.title}>
                <span className="welcome-detail-sample">{item.sample}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="welcome-outro">
          <h2>{copy.ready}</h2>
          <p>{copy.readyBody}</p>
          <a
            className="welcome-primary"
            href="https://www.instagram.com/"
            target="_blank"
            rel="noreferrer">
            {copy.open}
          </a>
        </section>
        <section className="welcome-support" aria-labelledby="support-title">
          <div className="welcome-support-copy">
            <p className="welcome-chapter-label">{copy.support}</p>
            <h2 id="support-title">{copy.supportTitle}</h2>
            <p>{copy.supportBody}</p>
          </div>
          <div className="welcome-support-actions">
            <div className="welcome-support-buttons">
              <a
                className="welcome-support-button"
                href="https://buymeacoffee.com/emirkabal"
                target="_blank"
                rel="noreferrer">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true">
                  <path d="M5 8h12v7a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5V8Zm12 1h1a3 3 0 1 1 0 6h-1M9 3v2m4-2v2M3 22h16" />
                </svg>
                {copy.supportAction}
              </a>
              <a
                className="welcome-support-button"
                href="https://github.com/sponsors/emirkabal"
                target="_blank"
                rel="noreferrer">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true">
                  <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
                </svg>
                GitHub Sponsors
              </a>
            </div>
            <a
              className="welcome-support-source"
              href="https://github.com/emirkabal/better-instagram-videos"
              target="_blank"
              rel="noreferrer">
              {copy.supportGithub}
            </a>
          </div>
        </section>
      </main>

      <footer className="welcome-footer">
        <a href="https://emirkabal.com" target="_blank" rel="noreferrer">
          Emir Kabal
        </a>
        <a
          href="https://github.com/emirkabal/better-instagram-videos"
          target="_blank"
          rel="noreferrer">
          GitHub
        </a>
        <a href="#support-title">{copy.support}</a>
        <a
          className="welcome-credit"
          href="https://github.com/mdn/interactive-examples/tree/main/live-examples/media/cc0-videos"
          target="_blank"
          rel="noreferrer">
          {copy.credit}
        </a>
      </footer>
    </div>
  )
}
