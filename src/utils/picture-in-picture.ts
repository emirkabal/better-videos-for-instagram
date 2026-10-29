import { getUiDirection, t } from "./i18n"
import type { PageMode } from "./page-mode"
import { PIP_INITIAL_SIZE } from "./pip-window"
import { navigateReel } from "./reel-navigation"
import { getActiveInstagramVideo } from "./video"

type CapturableVideo = HTMLVideoElement & { captureStream?: () => MediaStream }
type DocumentPip = {
  requestWindow(options: {
    width: number
    height: number
    preferInitialWindowPlacement?: boolean
  }): Promise<Window>
}
type PipWindow = Window & { documentPictureInPicture?: DocumentPip }

export type PipControlsActions = {
  setPlaying: (playing: boolean) => void
  next: () => void
  previous: () => void
  close: () => void
  followReels: boolean
}
export type PipControlsRenderer = (
  host: HTMLElement,
  actions: PipControlsActions
) => { update: (video: HTMLVideoElement) => void; destroy: () => void }

export class PictureInPictureController {
  private source: HTMLVideoElement | null = null
  private pipWindow: Window | null = null
  private mirror: HTMLVideoElement | null = null
  private stream: MediaStream | null = null
  private sourceCleanup: (() => void) | null = null
  private listeners = new Set<() => void>()
  private followsReels = false
  private active = false
  private pending = false
  private generation = 0
  private renderer: PipControlsRenderer | null = null
  private controls: ReturnType<PipControlsRenderer> | null = null
  private wantsPlayback = false
  private resuming: HTMLVideoElement | null = null
  private cancelNavigation: (() => void) | null = null
  private pageMode: PageMode | null = null

  setPageMode(mode: PageMode) {
    if (
      this.pageMode !== null &&
      this.pageMode !== mode &&
      (this.active || this.pending)
    )
      this.close()
    this.pageMode = mode
  }

  setControlsRenderer(renderer: PipControlsRenderer) {
    this.renderer = renderer
  }

  setPlaying = (playing: boolean) => {
    if (!this.source) return
    this.wantsPlayback = playing
    this.markSource()
    if (playing) this.resumeSource()
    else this.source.pause()
  }

  private markSource() {
    this.source?.setAttribute(
      "data-bigv-pip-playing",
      String(this.wantsPlayback)
    )
  }

  private resumeSource() {
    const video = this.source
    if (
      !video ||
      !this.active ||
      !this.wantsPlayback ||
      !video.paused ||
      this.resuming === video
    )
      return
    this.resuming = video
    void video
      .play()
      .catch(() => {
        if (this.source === video && video.paused) {
          this.wantsPlayback = false
          this.markSource()
        }
      })
      .finally(() => {
        if (this.resuming === video) this.resuming = null
      })
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
  getSnapshot = () => this.active
  getPending = () => this.pending
  private notify() {
    this.listeners.forEach((listener) => listener())
  }

  supported(video: HTMLVideoElement) {
    return Boolean(
      ((window as PipWindow).documentPictureInPicture &&
        typeof (video as CapturableVideo).captureStream === "function") ||
        (document.pictureInPictureEnabled &&
          typeof video.requestPictureInPicture === "function")
    )
  }

  async toggle(video: HTMLVideoElement, followReels = false) {
    if (this.pending) return
    if (this.active) {
      this.close()
      return
    }
    if (video.readyState === 0 || video.disablePictureInPicture)
      throw new Error("Video not ready")
    this.pending = true
    // Opening the floating window can blur Instagram before requestWindow resolves.
    this.wantsPlayback = !video.paused
    this.notify()
    const generation = ++this.generation
    try {
      const api = (window as PipWindow).documentPictureInPicture
      this.followsReels = followReels
      if (
        api &&
        typeof (video as CapturableVideo).captureStream === "function"
      ) {
        const pipWindow = await api.requestWindow(PIP_INITIAL_SIZE)
        if (generation !== this.generation) {
          pipWindow.close()
          return
        }
        this.pipWindow = pipWindow
        this.createPlayer(pipWindow, followReels)
        pipWindow.addEventListener(
          "pagehide",
          () => {
            if (this.pipWindow === pipWindow) this.close()
          },
          { once: true }
        )
        this.active = true
        this.setSource(video)
      } else {
        await video.requestPictureInPicture()
        if (generation !== this.generation) return
        this.active = true
        this.bindNative(video)
      }
    } catch (error) {
      if (generation === this.generation) this.close()
      throw error
    } finally {
      this.pending = false
      this.notify()
    }
  }

  private createPlayer(pipWindow: Window, followReels: boolean) {
    const doc = pipWindow.document
    doc.title = t("pipLabel")
    doc.documentElement.lang = chrome.i18n.getUILanguage?.() || "en"
    doc.documentElement.dir = getUiDirection()
    const mirror = doc.createElement("video")
    mirror.autoplay = true
    mirror.muted = true // Audio stays on the original player; never play it twice.
    mirror.playsInline = true
    mirror.setAttribute("data-bigv-pip-mirror", "")
    mirror.tabIndex = 0
    mirror.setAttribute("role", "button")
    mirror.onclick = () => {
      if (this.source) this.setPlaying(this.source.paused)
    }
    mirror.onkeydown = (event) => {
      if (event.key !== " " && event.key !== "Enter") return
      event.preventDefault()
      mirror.click()
    }
    this.mirror = mirror
    const stage = doc.createElement("div")
    stage.className = "bigv-pip-video-stage"
    stage.append(mirror)
    const host = doc.createElement("div")
    host.className = "bigv-pip-controls-host"
    doc.body.append(stage, host)
    this.controls =
      this.renderer?.(host, {
        followReels,
        setPlaying: this.setPlaying,
        close: () => this.close(),
        next: () => this.navigateReel(1),
        previous: () => this.navigateReel(-1)
      }) ?? null
  }

  private navigateReel(direction: 1 | -1) {
    if (!this.active || !this.followsReels || !this.source) return
    this.cancelNavigation?.()
    this.cancelNavigation = navigateReel(
      this.source,
      direction,
      this.pipWindow ?? window,
      () => {
        this.follow(getActiveInstagramVideo())
      }
    )
  }

  advanceReel(video: HTMLVideoElement) {
    if (!this.active || !this.followsReels || this.source !== video)
      return false
    this.navigateReel(1)
    return true
  }

  private setSource(video: HTMLVideoElement) {
    if (this.source === video) return
    this.cancelNavigation?.()
    this.cancelNavigation = null
    this.sourceCleanup?.()
    this.stopStream()
    const previous = this.source
    this.source = video
    this.markSource()
    if (
      this.followsReels &&
      document.documentElement.getAttribute("data-bigv-pip-reels") !== "true"
    ) {
      document.documentElement.setAttribute("data-bigv-pip-reels", "true")
      document.dispatchEvent(new Event("visibilitychange"))
    }
    if (previous && this.followsReels) previous.pause()
    this.controls?.update(video)
    const attach = () => {
      if (
        !this.active ||
        this.source !== video ||
        !this.mirror ||
        video.readyState < 2
      )
        return
      try {
        // Keep the same live stream through pause/play and seeking. Replacing
        // srcObject on each "playing" event clears the mirror's decoded frame.
        if (this.mirror.srcObject && this.stream?.getVideoTracks().some((track) => track.readyState !== "ended")) {
          this.resumeSource()
          return
        }
        const captured = (video as CapturableVideo).captureStream!()
        this.stopStream()
        this.stream = captured
        this.mirror.srcObject = new MediaStream(captured.getVideoTracks())
        void this.mirror.play().catch(() => {})
        this.resumeSource()
      } catch {
        /* Retry on the next loadeddata/playing event. */
      }
    }
    const onPlay = () => {
      this.wantsPlayback = true
      this.markSource()
      this.updateMirrorLabel()
    }
    const onPause = () => {
      if (video.ended) return
      if (
        this.wantsPlayback &&
        !video.ended &&
        (document.hidden || !document.hasFocus())
      ) {
        this.resumeSource()
      } else {
        this.wantsPlayback = false
        this.markSource()
      }
      this.updateMirrorLabel()
    }
    const emptied = () => {
      this.stopStream()
      if (this.mirror) this.mirror.srcObject = null
    }
    video.addEventListener("loadeddata", attach)
    video.addEventListener("playing", attach)
    video.addEventListener("emptied", emptied)
    video.addEventListener("play", onPlay)
    video.addEventListener("pause", onPause)
    this.sourceCleanup = () => {
      video.removeEventListener("loadeddata", attach)
      video.removeEventListener("playing", attach)
      video.removeEventListener("emptied", emptied)
      video.removeEventListener("play", onPlay)
      video.removeEventListener("pause", onPause)
      video.removeAttribute("data-bigv-pip-playing")
    }
    attach()
    this.resumeSource()
    this.updateMirrorLabel()
  }

  private updateMirrorLabel() {
    this.mirror?.setAttribute(
      "aria-label",
      t(this.source?.paused ? "playLabel" : "pauseLabel")
    )
  }

  private bindNative(video: HTMLVideoElement) {
    this.sourceCleanup?.()
    this.source = video
    this.markSource()
    const syncIntent = () => {
      this.wantsPlayback = !video.paused
      this.markSource()
    }
    const leave = () => {
      if (document.pictureInPictureElement !== video && this.source === video)
        this.close()
    }
    video.addEventListener("leavepictureinpicture", leave)
    video.addEventListener("play", syncIntent)
    video.addEventListener("pause", syncIntent)
    this.sourceCleanup = () => {
      video.removeEventListener("leavepictureinpicture", leave)
      video.removeEventListener("play", syncIntent)
      video.removeEventListener("pause", syncIntent)
      video.removeAttribute("data-bigv-pip-playing")
    }
    this.resumeSource()
  }

  follow(video: HTMLVideoElement | null) {
    if (!this.active || !this.followsReels || !video || this.source === video)
      return
    if (this.pipWindow) this.setSource(video)
    else if (
      video.readyState > 0 &&
      document.pictureInPictureElement &&
      !this.pending
    ) {
      this.pending = true
      const generation = this.generation
      const previous = this.source
      this.sourceCleanup?.()
      this.sourceCleanup = null
      void video
        .requestPictureInPicture()
        .then(() => {
          if (this.active && generation === this.generation)
            this.bindNative(video)
        })
        .catch(() => {
          if (previous && this.active && generation === this.generation)
            this.bindNative(previous)
        })
        .finally(() => {
          this.pending = false
          this.notify()
        })
    }
  }

  stopFollowing() {
    if (this.followsReels) this.close()
  }
  private stopStream() {
    this.stream?.getTracks().forEach((track) => track.stop())
    this.stream = null
  }
  close() {
    ++this.generation
    this.cancelNavigation?.()
    this.cancelNavigation = null
    document.documentElement.removeAttribute("data-bigv-pip-reels")
    const pipWindow = this.pipWindow
    const nativeVideo = this.source
    this.sourceCleanup?.()
    this.sourceCleanup = null
    this.controls?.destroy()
    this.controls = null
    this.stopStream()
    if (this.mirror) this.mirror.srcObject = null
    this.pipWindow = null
    this.mirror = null
    this.source = null
    this.wantsPlayback = false
    this.resuming = null
    this.active = false
    this.followsReels = false
    if (pipWindow && !pipWindow.closed) pipWindow.close()
    else if (nativeVideo && document.pictureInPictureElement === nativeVideo)
      void document.exitPictureInPicture().catch(() => {})
    this.notify()
    document.dispatchEvent(new Event("visibilitychange"))
  }
}

export const pictureInPicture = new PictureInPictureController()
