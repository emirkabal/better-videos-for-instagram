# Contributing

Thanks for contributing to Better Videos for Instagram. See the
[README](README.md#contribution) for local setup and use the GitHub bug report
form for problems, including the popup's troubleshooting output.

## Commits

Keep each commit focused on one change so it is easy to review and revert. Use
English commit messages to match the repository's history.

## Message format

```text
type(scope): short imperative summary

Explain why the change is needed and any behavior or compatibility implications.
Include relevant validation and reference an issue when applicable.
```

The scope and body are optional for small changes. Use a concise subject without
a trailing period. Common types:

| Type       | Use for                                      |
| ---------- | -------------------------------------------- |
| `fix`      | Correcting broken behavior                   |
| `feat`     | Adding user-facing behavior                  |
| `refactor` | Restructuring code without changing behavior |
| `docs`     | Documentation and issue templates            |
| `style`    | Formatting-only changes                      |
| `test`     | Regression checks and fixtures               |
| `build`    | Bun, WXT, dependencies and packaging         |
| `ci`       | GitHub Actions changes                       |
| `chore`    | Other repository maintenance                 |

Useful scopes include `player`, `reels`, `stories`, `pip`, `popup` and `i18n`.
Choose a scope that describes the change; it is not a fixed list.

Examples:

```text
fix(reels): preserve native Space navigation
feat(player): show feedback when seeking with the keyboard
docs: request troubleshooting output in bug reports
build: update the WXT toolchain
```

Use `Fixes #123` in the body only when the change actually resolves that issue.
For breaking changes, use `!` after the type/scope and explain the break in a
`BREAKING CHANGE:` paragraph.

## Before committing

1. Review `git status --short` and `git diff`. Keep unrelated work separate.
2. Format the changed files with `bun fmt`, then run `bun run lint`.
3. Scale validation to the change:
   - Documentation/templates: check links, wording and YAML syntax. A browser
     regression run is unnecessary.
   - TypeScript/React behavior: run `bun run typecheck` and the relevant existing
     tests (`bun run test` runs the unit suite).
   - Playback, injection, fullscreen or PiP: build the affected browser target
     and exercise the affected flow. Use `bun run test:browser` or
     `bun run test:extension` when those regressions are relevant; record any
     manual coverage or checks you could not run.
   - Release packaging: `bun run package-all` builds and validates both targets.
4. Stage specific files, then inspect `git diff --cached` and
   `git diff --cached --check` before committing.

Commit source files and intentional dependency changes, including `bun.lock`
when dependencies change. Generated `.output/`, `.wxt/`, `.plasmo/`, `build/`,
`outputs/` and `node_modules/` directories stay out of commits. Bump the version
as part of release preparation, rather than for every commit.

```sh
git status --short
git diff
git add path/to/changed-file
git diff --cached
git diff --cached --check
git commit
```

## Bug reports

Use the GitHub bug report form and include the popup's **Troubleshoot this page**
output. Open the affected Instagram tab, expand that section in the extension
popup, click **Check again**, then copy the details into the form. If no output
appears, include the exact status message and your environment instead.
