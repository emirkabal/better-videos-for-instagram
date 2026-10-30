# Agent instructions

These instructions apply to the whole repository. Follow the user's current
scope and preferences. Read [README.md](README.md) for runtime details and
[CONTRIBUTING.md](CONTRIBUTING.md) for contribution and commit conventions.

## Workflow

- Inspect the affected code and working tree before editing. Preserve unrelated
  changes; do not reset or overwrite another task's work.
- Make the smallest complete change. Reuse existing components, hooks, utilities
  and interaction patterns. Avoid unrelated refactors and new dependencies.
- Use `rg` for searches. Communicate in the user's language and keep progress
  updates and final reports concise.
- Create commits, push changes or publish releases only when requested. Adding
  documentation about committing does not itself request a commit.

## Toolchain and layout

- Use Bun and the version declared in `package.json`. Keep `bun.lock` as the
  dependency lockfile. Use `bun fmt` for formatting.
- The extension uses WXT with `srcDir: "src"` and the `@/` source alias.
  Entrypoints belong in `src/entrypoints/`; do not restore Plasmo entrypoints.
- `src/features/instagram/pages/` owns Feed, Reels and Stories injectors;
  `runtime/` coordinates lifecycle, route detection and Instagram shortcuts.
  `bridges/` contains MAIN-world guards and their isolated-world clients;
  `media/` and `navigation/` contain Instagram-specific helpers.
  `src/features/player/` owns shared controller injection and lifecycle.
- `src/components/Controller/` contains player, Story and PiP UI. Shared hooks
  and browser/media utilities belong in `src/hooks/` and the corresponding
  `src/utils/{fullscreen,pip,playback,media,storage,extension}/` folder.
- Processed assets belong in `src/assets/`; extension locale catalogs belong in
  `public/_locales/`. Follow the existing `?react`, `?url` and `?inline` imports.
- Edit source files, not generated `.output/`, `.wxt/`, `.plasmo/` or `build/`
  files. Do not commit generated output, local reports or dependencies.

## Compatibility and behavior

- Preserve Chrome MV3 and Firefox MV2 support, existing permissions and the
  Firefox extension ID unless the requested task changes those requirements.
- Keep page-world guards registered in `MAIN` at `document_start`. Keep the
  background registration and manifest checks aligned with entrypoint changes.
- Use WXT storage through `src/utils/storage/settings.ts` and the shared `useSetting`
  hook. Preserve storage areas/keys and read compatibility with legacy JSON
  strings. New writes use native values; do not rewrite preferences on startup
  or restore the Plasmo dependency. Preserve legacy click-mode resolution.
- Keep update-page opt-out available. Patch releases stay quiet; feature/major
  updates respect opt-out. Preserve the legacy welcome URL redirect.
- Prefer semantic DOM signals within the relevant player's scope. Do not depend
  on Instagram's generated classes, private React internals or DevTools names.
  Preserve unknown native controls when detection is uncertain.
- Handle Instagram replacing/reusing DOM nodes. Clean up React roots, observers,
  event listeners, timers and captured media tracks when their owner changes.
- Target the active/selected video. Fullscreen and PiP must keep explicit
  play/pause intent and must not start background videos during handoff.
- Save audio preferences from explicit user actions; automatic Instagram mute
  events must not overwrite them. Respect the configured volume reduction.
- Preserve native Reels Space and ↑/↓ behavior, including fullscreen. K toggles
  playback; +/− changes volume. Feed and PiP additionally accept Space and ↑/↓.
  Do not intercept typing, modifier shortcuts or native widget interactions.
- Follow the current fade behavior and reduced-motion preferences. Keep controls
  available during volume/menu/drag interactions. Timeline hover or dragging
  hides the separate button dock while retaining visible keyboard focus.

## UI, localization and diagnostics

- Use the existing localization helper and catalogs for user-visible text.
  Maintain English fallback and update the existing translated controls as needed.
- Preserve accessible names, native button/input behavior and keyboard focus.
  Scope styles to extension UI so they do not alter Instagram's layout.
- Photo Story PiP requires Document PiP capability; do not assume a browser name
  guarantees API support. Preserve photo/video following and cleanup.
- Keep troubleshooting output useful for public bug reports without account
  identifiers, media URLs, cookies, tokens or private page content. Keep the
  issue form's instructions aligned with the actual popup labels and output.

## Verification

Scale checks to the change and respect the user's requested test budget:

| Change                                 | Appropriate checks                                                     |
| -------------------------------------- | ---------------------------------------------------------------------- |
| Docs or issue templates                | Format, links and YAML syntax; no browser suite                        |
| Small CSS/UI adjustment                | Format, affected build and focused visual/manual check where available |
| TypeScript or behavior                 | `bun run typecheck` and relevant existing unit tests                   |
| Playback, injection, fullscreen or PiP | Affected builds and focused regressions/manual flows                   |
| Release preparation                    | `bun run package-all`                                                  |

- `bun run lint` checks formatting; `bun run test` runs the unit suite.
- `bun run build` and `bun run build:firefox` include resource/manifest checks.
- `bun run test:browser` uses both packaged builds, so build both first.
  `bun run test:extension` exercises the actual unpacked Chromium extension.
- Add behavioral regressions for meaningful logic fixes. Do not add tests that
  merely mirror a small style change or rerun broad suites after checks pass
  unless new changes, failures or unresolved concerns justify it.
- Report what changed, what was checked and any material verification limit.
  Local fixtures do not establish that a live Instagram session was verified.
