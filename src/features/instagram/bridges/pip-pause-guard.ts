export function installPipPauseGuard() {
  const installKey = Symbol.for("better-instagram-videos.pip-pause-guard")
  const guardWindow = window as typeof window & { [key: symbol]: unknown }

  if (!guardWindow[installKey]) {
    guardWindow[installKey] = true
    const documentPrototype =
      typeof Document === "undefined"
        ? Object.getPrototypeOf(document)
        : Document.prototype
    const nativeHidden = Object.getOwnPropertyDescriptor(
      documentPrototype,
      "hidden"
    )?.get
    const nativeVisibility = Object.getOwnPropertyDescriptor(
      documentPrototype,
      "visibilityState"
    )?.get
    const nativeHasFocus = document.hasFocus
    const reallyHidden = () =>
      nativeHidden ? nativeHidden.call(document) : document.hidden
    const reallyFocused = () =>
      nativeHidden ? nativeHasFocus.call(document) : document.hasFocus()
    const documentPipWindow = () =>
      (
        window as typeof window & {
          documentPictureInPicture?: { window?: Window | null }
        }
      ).documentPictureInPicture?.window
    const keepReelsActive = () => {
      const pip = documentPipWindow()
      return Boolean(
        pip &&
        !pip.closed &&
        document.documentElement.getAttribute("data-bigv-pip-reels") === "true"
      )
    }
    // Instagram also gates its Reel pagination on page visibility/focus. During
    // a Reel PiP session the floating player is the user's active viewing surface.
    // Keep native values for the pause guard and restore observable values as
    // soon as that session closes. Feed PiP and ordinary tabs are unaffected.
    if (nativeHidden && nativeVisibility) {
      Object.defineProperties(document, {
        hidden: {
          configurable: true,
          get: () => (keepReelsActive() ? false : nativeHidden.call(document))
        },
        visibilityState: {
          configurable: true,
          get: () =>
            keepReelsActive() ? "visible" : nativeVisibility.call(document)
        },
        hasFocus: {
          configurable: true,
          writable: true,
          value: () => keepReelsActive() || nativeHasFocus.call(document)
        }
      })
    }
    const nativePause = HTMLMediaElement.prototype.pause
    const nativePlay = HTMLMediaElement.prototype.play
    const fullscreenSource = () => {
      const source = document.querySelector?.<HTMLVideoElement>(
        '[data-bigv-fullscreen-source="true"]'
      )
      return source && document.fullscreenElement?.contains(source)
        ? source
        : null
    }
    HTMLMediaElement.prototype.play = function () {
      const source = fullscreenSource()
      if (source && this instanceof HTMLVideoElement && this !== source)
        return Promise.resolve()
      return nativePlay.call(this)
    }
    HTMLMediaElement.prototype.pause = function () {
      if (
        this === fullscreenSource() &&
        this.getAttribute("data-bigv-fullscreen-playing") === "true" &&
        !this.ended
      )
        return
      const pipWindow = documentPipWindow()
      // Only the opted-in PiP source is protected. Normal Instagram playback,
      // intentional PiP pauses and every other media element keep native behavior.
      if (
        this instanceof HTMLVideoElement &&
        this.getAttribute("data-bigv-pip-playing") === "true" &&
        ((pipWindow && !pipWindow.closed) ||
          document.pictureInPictureElement === this) &&
        !this.ended &&
        (reallyHidden() || !reallyFocused())
      )
        return
      nativePause.call(this)
    }
  }
}
