# Better Videos for Instagram

<img align="right" src="/src/assets/icon.png" width="96" alt="Better Videos for Instagram logo">

A browser extension that makes Instagram videos easier to watch and control. Available for Chrome, Firefox, and compatible browsers.

## Features

- Playback & Speed control support
- Volume control (remembered) support
- Picture in Picture support
- Fullscreen support
- Autoskip support
- Keyboard shortcuts
- Supports all videos on the Instagram

## Install

[link-chrome]: https://chromewebstore.google.com/detail/ijgmchfimkocepiapjeoehcicfnhhchp "Version published on Chrome Web Store"
[link-firefox]: https://addons.mozilla.org/en-US/firefox/addon/better-videos-for-instagram/ "Version published on Mozilla Add-ons"

[<img src="https://raw.githubusercontent.com/alrra/browser-logos/90fdf03c/src/chrome/chrome.svg" width="48" alt="Chrome" valign="middle">][link-chrome] [<img valign="middle" src="https://img.shields.io/chrome-web-store/v/ijgmchfimkocepiapjeoehcicfnhhchp?label=%20">][link-chrome] and other Chromium browsers

[<img src="https://raw.githubusercontent.com/alrra/browser-logos/90fdf03c/src/firefox/firefox.svg" width="48" alt="Firefox" valign="middle">][link-firefox] [<img valign="middle" src="https://img.shields.io/amo/v/better-videos-for-instagram.svg?label=%20">][link-firefox] and other Gecko-based browsers

_If you like Better Videos for Instagram, consider [sponsoring or hiring](https://github.com/sponsors/emirkabal) the maintainer [@emirkabal](https://twitter.com/emirkabal)_

## Preview

<img width="1280" height="800" alt="Better Videos for Instagram controls" src="https://github.com/user-attachments/assets/c0f037b2-48ea-4d42-b8d9-558ef54481be" />

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `K` | Play / pause |
| `←` / `→` | Seek backward / forward 5 seconds |
| `J` / `L` | Seek backward / forward 10 seconds |
| `+` / `-` | Volume up / down 5% |
| `M` | Mute / unmute |

Shortcuts work with supported Instagram videos and Picture-in-Picture. `Space` also controls playback in Feed and Stories; Reels keeps Instagram's default Space behavior.

## Development

Requires [Bun](https://bun.sh/) 1.4.4 or newer.

```bash
git clone https://github.com/emirkabal/better-videos-for-instagram.git
cd better-videos-for-instagram
bun install
bun run dev
```

For Firefox, use `bun run dev:firefox`. Run `bun run build` to build for Chrome or `bun run build:firefox` for Firefox.

## Contributing

Bug reports, suggestions, and pull requests are welcome. Open an [issue](https://github.com/emirkabal/better-videos-for-instagram/issues) or read [CONTRIBUTING](CONTRIBUTING.md) before contributing.

When reporting a bug, include the output from **Troubleshoot this page** in the extension popup, if available.

## License

Copyright (c) 2023-2026 Emir Kabal. Licensed under [GPL-3.0-only](LICENSE).

## Disclaimer

Instagram is a registered trademark. This extension is an independent project and is not affiliated with, endorsed by, or supported by Instagram.
