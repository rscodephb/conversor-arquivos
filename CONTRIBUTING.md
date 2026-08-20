# Contributing

Issues and pull requests are welcome. The UI and user-facing copy are in Portuguese; code, comments, and commit messages are in English.

## Setup

```bash
npm run setup
npm test
npm run tauri:dev
```

Browser-only UI: `npm run dev` at `http://localhost:1420`.

Windows native commands go through `scripts/invoke-tauri.ps1` so the working Windows SDK is selected. Details: [docs/dev.md](docs/dev.md).

## Checks before a PR

```bash
npm test
npm run build
```

Keep functions small, typed, and without `any`. Prefer tests next to the pure logic (`src/**/*.test.ts`) rather than UI snapshots.

Do not commit secrets, keystores, `.env`, or personal Drive paths.
