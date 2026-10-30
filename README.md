# Better Videos for Instagram

<img align="right" src="/src/assets/icon.png" width=96 alt="Better Videos for Instagram Logo">

Better Videos for Instagram is a browser extension available on the Chrome Web Store that enhances your Instagram experience by allowing easy video playback and volume adjustment.

**Features:**

- Playback & Speed control support
- Volume control (remembered) support
- Picture in Picture support
- Fullscreen support
- Autoskip support
- Supports all videos on the Instagram

## Install

[link-chrome]: https://chromewebstore.google.com/detail/ijgmchfimkocepiapjeoehcicfnhhchp "Version published on Chrome Web Store"
[link-firefox]: https://addons.mozilla.org/en-US/firefox/addon/better-videos-for-instagram/ "Version published on Mozilla Add-ons"

[<img src="https://raw.githubusercontent.com/alrra/browser-logos/90fdf03c/src/chrome/chrome.svg" width="48" alt="Chrome" valign="middle">][link-chrome] [<img valign="middle" src="https://img.shields.io/chrome-web-store/v/ijgmchfimkocepiapjeoehcicfnhhchp?label=%20">][link-chrome] and other Chromium browsers

[<img src="https://raw.githubusercontent.com/alrra/browser-logos/90fdf03c/src/firefox/firefox.svg" width="48" alt="Firefox" valign="middle">][link-firefox] [<img valign="middle" src="https://img.shields.io/amo/v/better-videos-for-instagram.svg?label=%20">][link-firefox] and other Gecko-based browsers

_If you like Better Videos for Instagram, consider [sponsoring or hiring](https://github.com/sponsors/emirkabal) the maintainer [@emirkabal](https://twitter.com/emirkabal)_

## Usage

After installation, you can use the extension to control video playback and adjust volume on Instagram effortlessly.

<img width="1280" height="800" alt="English" src="https://github.com/user-attachments/assets/c0f037b2-48ea-4d42-b8d9-558ef54481be" />

## Contribution

We welcome contributions from the community! If you have ideas for improvements or find any issues, please open an [issue](https://github.com/emirkabal/better-videos-for-instagram/issues) or submit a pull request.

For bugs, use the [bug report form](https://github.com/emirkabal/better-videos-for-instagram/issues/new?template=bug_report.yml)
and paste the extension popup's **Troubleshoot this page** output. If it cannot
produce output, include its exact status message and your environment instead.
See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines, commit messages and checks before committing.

1. **Clone the repository:**

   ```bash
   git clone https://github.com/emirkabal/better-videos-for-instagram.git
   ```

2. **Navigate to the project directory:**

   ```bash
   cd better-videos-for-instagram
   ```

3. **Install dependencies:**

   ```bash
   bun install
   ```

4. **Development area**

   ```bash
   bun run dev
   # WXT opens a development browser with hot reload.
   # For Firefox: bun run dev:firefox
   ```

5. **Lint and format:**

   ```bash
   bun run lint && bun run format
   ```

6. **Ensure build is working:**

   ```bash
   bun run build
   ```

## Runtime

Use Bun 1.4.4 or newer. [WXT](https://wxt.dev/) and Vite build the extension
directly in Bun; no Node subprocess or Parcel compiler is needed. Dependencies
use `bun.lock`, tests run in Bun, and `bun fmt` handles formatting.

`src/entrypoints/` defines the background worker, Instagram content script, popup,
welcome page, sandbox demo, and two page-world scripts. `srcDir: "src"` keeps
source code under `src/`, with the standard `@/` alias.
Instagram-specific code is grouped under `src/features/instagram/`: `pages/`
contains Feed/Reels/Stories injectors, `runtime/` coordinates startup and routes,
`bridges/` separates page-world scripts and their clients, and `media/` and
`navigation/` hold Instagram helpers. Shared utilities are grouped into
`src/utils/fullscreen/`, `pip/`, `playback/`, `media/`, `storage/` and `extension/`.
`src/assets/` contains processed media, `src/components/` reusable UI,
`src/hooks/` React hooks, `src/utils/` shared utilities, and `src/features/`
Instagram/player behavior. Locally defined WXT modules belong in root
`modules/` if needed. Locales are copied from `public/_locales/`. Vite handles
SVG React components (`?react`), asset URLs (`?url`) and PiP stylesheet strings
(`?inline`).

Chrome uses Manifest V3 and Firefox uses Manifest V2, retaining the existing
Firefox extension ID and permissions. Both register the page scripts in `MAIN`
at `document_start` through `scripting`, so Instagram cannot capture unguarded
media/fetch methods first. Registration removes legacy Plasmo script IDs and
repairs existing WXT registrations on background startup.

Settings use [WXT storage](https://wxt.dev/storage) items in
`src/utils/storage/settings.ts` and the shared React
`useSetting` hook. Existing sync keys and storage areas are preserved. Legacy
Plasmo JSON strings are decoded on reads and watches; explicit changes write
native WXT values. Startup does not rewrite old settings, avoiding cross-tab
migration races and preserving disabled/update opt-out preferences. Existing
`tabs/welcome.html` links redirect to `welcome.html` and retain query/hash.

Production output is `.output/chrome-mv3/` and `.output/firefox-mv2/`. Load the
Chrome folder at `chrome://extensions` with developer mode enabled. Run
`bun run package-all` to create `.output/chrome-mv3.zip`,
`.output/firefox-mv2.zip` and Firefox's source archive. The manually triggered
store workflow builds with Bun/WXT and retains the existing publishing action
and credentials.

Audio preferences are saved from explicit extension/native audio actions;
Instagram's automatic mute events do not change the shared choice. The Reels
native volume controls in Feed and Reels are hidden while replacement controls are enabled and
restored on disable. Identification follows the video's single-video container
boundary and checks individual audio/slider labels plus the observed muted
speaker SVG. It does not require React Developer Tools or private component
names. DOM changes are rescanned; unrecognized controls remain native.

Controls fade in/out on interaction. Open volume or speed controls and dragging
keep the panel visible until the interaction ends. Reduced motion disables the
transition. Stories use a centered floating panel above Instagram's reply row,
with horizontal volume, previous/next Story, play/pause, speed, PiP, fullscreen
and a timeline. Photo Stories have previous/next and PiP controls without a fake
video timeline. Document PiP follows both photos and videos in the same window;
photo PiP requires that API. Browsers with only native video PiP cannot show photos.

Feed fullscreen temporarily removes enclosing link destinations and captures
video-surface clicks for play/pause in every click mode. It restores the latest
destination on exit, including links Instagram updates during fullscreen.

The Open in Reels action only appears while a valid native anchor exists.
PiP keeps the same controls panel across Reel changes, preserving hidden state;
media events alone do not reveal it. Pointer/keyboard use reveals controls with
short transitions, respecting reduced motion.

## Keyboard shortcuts

Keyboard shortcuts work on the hovered or selected visible Feed video, or the
active Reels/Story/fullscreen video. Document PiP uses the same keys and follows
the current source. Photo Story PiP uses left/right arrows for previous/next.
Text fields, editable captions, buttons, menus and sliders retain their own keys;
Ctrl/Alt/Meta combinations and Shift shortcuts (except typing +) are preserved. Pausing/muting does not repeat
while holding a key. Volume shortcuts respect the configured volume reduction.

| Keys  | Action                             |
| ----- | ---------------------------------- |
| K     | Play / pause                       |
| ← / → | Seek backward / forward 5 seconds  |
| J / L | Seek backward / forward 10 seconds |
| + / − | Volume up / down 5%                |
| M     | Mute / unmute                      |

In Reels, Space retains Instagram's native behavior, including fullscreen;
use K for playback. Feed, Story videos and Document PiP also accept Space for
play/pause. In Reels and Stories, ↑/↓ retain Instagram's native navigation,
including fullscreen. Feed and Document PiP also accept ↑/↓ for volume. The unshifted =
key and numpad +/− work for volume too; browser zoom shortcuts remain native.

Seeking, volume and playback changes show a brief localized overlay. Repeated
seeks accumulate their actual seconds; seeking is clamped to the media duration.
The popup includes a collapsible shortcut reference.

## Regression checks

Run `bun run test`, `bun run typecheck`, and `bun run lint` for the source checks.
Build both browser packages with `bun run build` and `bun run build:firefox`; each
build also checks its content resources and CSS isolation.

For the browser regressions, install Chromium with `bun x playwright install chromium`
and run `bun run test:browser` after both builds. To use an installed Chrome instead,
set `BIGV_BROWSER_CHANNEL=chrome`. The fixtures run the packaged content scripts
and real React controls with a simulated extension API. They cover language
variants, paused HTTPS videos, control recovery, native controls and diagnostics.
They do not use a live Instagram account.

For Firefox, run `bun x playwright install firefox`, set `BIGV_BROWSER=firefox`
and run `bun run test:browser` without `BIGV_BROWSER_CHANNEL`.

`bun run test:extension` loads the actual unpacked Chrome extension in a fresh
Playwright Chromium profile. Install Chromium first. This verifies real
background registration, MAIN execution before the page's first script,
content injection, stored legacy settings, popup changes and the old welcome
URL redirect with the browser's extension APIs.

If a page was already open during installation or an update, reload Instagram.
The popup's troubleshooting panel checks the connection and exposes local support
details without video URLs or session data. Patch updates (1.5.0 to 1.5.1) stay
quiet. Feature updates (1.5.x to 1.6.0) can open the welcome page, unless **Show
feature updates** is disabled. That switch is always available on the welcome
page and in the popup. **What's new** opens the page manually at any time.

**Video clicks** offers Native, Pause, and Pause + Reels. Existing click-to-pause
preferences keep their behavior. The third mode adds a button which opens the
same video using Instagram's own Reels navigation.

## Legal

Instagram is a registered trademark. This extension was developed independently of Instagram, by someone who is not related or affiliated with Instagram, without any help or endorsement from them.

## License

Copyright (c) 2023-2026 Emir Kabal.

This project is licensed under the GNU General Public License version 3.0 (GPL-3.0-only). See the [LICENSE](LICENSE) file for the full license text.
