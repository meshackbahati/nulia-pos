# Changelog

All notable changes to Nulia POS are documented here. Follows Keep a Changelog and Semantic Versioning.

## [1.12.0] - 2026-09-08

### Added
- **Nulia Wallet (per-business ledger):** `ui/src/pages/WalletPage.tsx:1` - branch-scoped wallet with 24h settlement, ledger table, permission-aware.
- **Per-branch M-Pesa scope:** `ui/src/pages/SettingsPage.tsx:60` - whole-business vs per-business credentials, branch selector.
- **Wallets navigation:** `ui/src/components/Layout.tsx:69` and `ui/src/App.tsx:42` - `/wallet` route for admin/manager.
- **MIT License:** `LICENSE:1` - open source under MIT.

### Changed
- **README:** `README.md:1` - concise, build-focused, all platforms, offline handling documented.
- **Electron Linux:** `ui/electron/main.cjs:5` - `ozone-platform-hint auto`, `WaylandWpColorManager` disabled, GPU fallback - fixes Arch `wayland_wp_color_manager.cc:277` freeze.
- **Android icons:** Regenerated `mipmap-*` from new logo via `rsvg-convert` and `magick`.

### Fixed
- **Tenant isolation:** `server/src/routes/sales.js:65` - `/list` now enforces `organizationId` for non-super_admin.
- **User update:** `server/src/routes/users.js:130` - `userData` to `updateData` fix.
- **JWT prod guard:** `server/src/lib/auth.js:4` - prevents `next build` throw in production.
- **Wallet destination:** `server/src/routes/wallet.js:62` - persist destination, validate.
- **Layout:** `ui/src/components/Layout.tsx:87` - hide Wallets for `head_of_sales`.
- **Design:** `WalletPage.tsx:68` dark mode and ledger overflow fixes.

### Builds
- **Android APK:** `ui/dist-apk/Nulia-v1.12.0-release.apk` 37M signed `uber-apk-signer --ks nulia-release.jks --ksAlias nulia --ksPass nulia2026` SHA256 `27:AC:4E:92:...`.
- **Desktop:** `dist-electron/Nulia Setup 1.12.0.exe` 131M (nsis), `nulia-1.12.0-x64.pkg.tar.zst` 105M (pacman), `nulia_1.12.0_amd64.deb` 118M, `nulia-1.12.0-x86_64.AppImage` 162M - all via `electron-builder` with `AppImage+deb+pacman`.

## [1.11.0] - 2026-09-02
- Analytics per-role views, date-aware export, branch-leaderboard fixes.

## [1.10.0] - 2026-09-01
- POS overhaul: printer discovery, paper sizing, checkout transparency.

## [Unreleased]
- Nothing yet.
