# Changelog

All notable changes to Nulia POS are documented here. Follows Keep a Changelog and Semantic Versioning.

## [1.12.0] - 2026-09-08

### Added
- **Nulia Wallet (per-business ledger):** `ui/src/pages/WalletPage.tsx:1` - branch-scoped wallet with 24h Jumia settlement, withdraw with destination, ledger table, permission-aware (admin any branch, manager own branch).
- **Per-branch M-Pesa scope:** `ui/src/pages/SettingsPage.tsx:60` - whole-business vs per-business Daraja credentials, branch selector, scoped save via `_branchId`/`_scope`.
- **Wallets navigation:** `ui/src/components/Layout.tsx:69` and `ui/src/App.tsx:42` - `/wallet` route for admin/manager.
- **Server directory:** `backend-nextjs` to `server` for brevity and convention - preserves history via `git mv`, updates Docker and docs.
- **Minimalist logo:** `ui/public/logo.svg:1` - pure N geometry, `rx28` `#0A0A0A`, Inter 750 wordmark, no em dashes.
- **MIT License:** `LICENSE:1` - open source under MIT.

### Changed
- **README:** `README.md:1` - concise, build-focused, all platforms, offline handling documented.
- **Electron Linux:** `ui/electron/main.cjs:5` - `ozone-platform-hint auto`, `WaylandWpColorManager` disabled, GPU fallback - fixes Arch `wayland_wp_color_manager.cc:277` freeze.
- **Android icons:** Regenerated `mipmap-*` from new logo via `rsvg-convert` and `magick`.

### Fixed
- **Tenant isolation:** `server/src/routes/sales.js:65` - `/list` now enforces `organizationId` for non-super_admin.
- **User update:** `server/src/routes/users.js:130` - `userData` to `updateData` ReferenceError fix.
- **JWT prod guard:** `server/src/lib/auth.js:4` - `NEXT_PHASE !== 'phase-production-build'` prevents `next build` throw.
- **Wallet destination:** `server/src/routes/wallet.js:62` - persist `metadata.destination`, validate, status `pending`.
- **Wallet credit validation:** `wallet.js:62` - `isNaN` and `>0` guards.
- **Layout:** `ui/src/components/Layout.tsx:87` - hide Wallets for `head_of_sales` to match route.
- **Design:** `WalletPage.tsx:68` dark mode `bg-card`, `Layout` 86vw overlay, ledger `overflow-x-auto`.
- **Contributors:** Rewrote `emergent-agent-e1`, `google-labs-jules[bot]`, `v0`, `EC2 Default User`, `Athena` to `Meshack Bahati` via `git filter-repo`.

### Security
- **Secrets scrubbed:** `git filter-repo --invert-paths --path-glob '*.env' '*.jks'` and `replace-text` for `postgres://`, `xkeysib`, `BREVO_API_KEY`, `DATABASE_URL`, `JWT_SECRET`.

### Builds
- **Android APK:** `ui/dist-apk/Nulia-v1.12.0-release.apk` 37M signed `uber-apk-signer --ks nulia-release.jks --ksAlias nulia --ksPass nulia2026` SHA256 `27:AC:4E:92:...`.
- **Desktop:** `dist-electron/Nulia Setup 1.12.0.exe` 131M (nsis), `nulia-1.12.0-x64.pkg.tar.zst` 105M (pacman), `nulia_1.12.0_amd64.deb` 118M, `nulia-1.12.0-x86_64.AppImage` 162M - all via `electron-builder` with `AppImage+deb+pacman`.

## [1.11.0] - 2026-09-02
- Analytics per-role views, date-aware export, branch-leaderboard fixes.

## [1.10.0] - 2026-09-01
- POS overhaul: printer discovery, paper sizing, checkout transparency.

## [Unreleased]
- Nothing yet.
