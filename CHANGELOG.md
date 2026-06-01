# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-06-01

### Added
- Verified support for **Expo SDK 56** (React Native 0.85). The config plugin's
  prebuild mods (AdMob App ID in `AndroidManifest.xml`, mediation adapter
  dependencies, AppLovin Quality Service Gradle wiring, Maven repos, and
  SKAdNetwork IDs) were confirmed to apply on an Expo SDK 56 production app.

### Changed
- `package.json` `description` and `keywords` now reference Expo SDK 56.
- `example/` upgraded to Expo SDK 56 / React Native 0.85.
- `README.md` / `README.ja.md`: compatibility table and SDK notes updated for SDK 56.

### Notes
- No plugin code changes were required — the plugin is SDK-agnostic (it only
  modifies native build files at prebuild time). SDK 55 remains verified.

## [0.1.3] - 2026-04-17

### Documentation
- Add GitHub Sponsors integration: `.github/FUNDING.yml` for the native
  Sponsor button on the repo page, plus a Sponsor badge and a dedicated
  Sponsor section in `README.md` / `README.ja.md` so consumers can find
  the support link on npmjs.com as well.

### CI
- Bump release workflow actions to Node 24-runtime versions to silence
  the "Node.js 20 actions are deprecated" warning:
  - `actions/checkout` v4 → v6
  - `pnpm/action-setup` v4 → v5
  - `actions/setup-node` v4 → v6
  - `softprops/action-gh-release` v2 → v3

## [0.1.2] - 2026-04-17

### Fixed
- Add TypeScript declaration file (`plugin/index.d.ts`) so consumers get
  proper types instead of `TS7016: Could not find a declaration file for
  module '@fumitakayamada/expo-applovin-max'`.
  - `DEFAULT_SKADNETWORK_IDENTIFIERS` typed as `readonly string[]`
  - `NETWORK_REGISTRY` / `ALL_NETWORK_IDS` / `NetworkId` union exported
  - `ExpoAppLovinMaxOptions` and all sub-plugins
    (`withAppLovinMediationAdapters`, `withAppLovinQualityService`,
    `withSKAdNetwork`) typed as `ConfigPlugin<T>`
  - Default export typed as `ConfigPlugin<ExpoAppLovinMaxOptions>`

### Changed
- Automate releases via GitHub Actions: tag push (`v*`) publishes to npm
  with provenance (Trusted Publisher) and creates a GitHub Release.

## [0.1.1] - 2026-04-16

### Documentation
- Add iOS Ad Review setup steps to the install section
- Add `app.json` usage example

## [0.1.0] - 2026-04-16

### Added
- Initial release
- Expo config plugin for AppLovin MAX targeting Expo SDK 55+
- Mediation adapters for Android + iOS covering 29 networks (AppLovin,
  Google, Meta, Unity, Mintegral, Pangle, ironSource, Liftoff/Vungle,
  Amazon, BidMachine, DT Exchange, InMobi, etc.)
- Ad Review (AppLovin Quality Service) integration for Android + iOS
- `SKAdNetworkItems` injection into Info.plist
- Bundled `DEFAULT_SKADNETWORK_IDENTIFIERS` covering AppLovin MAX and all
  mediated networks

[0.2.0]: https://github.com/FumitakaYamada/expo-applovin-max/compare/v0.1.3...v0.2.0
[0.1.3]: https://github.com/FumitakaYamada/expo-applovin-max/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/FumitakaYamada/expo-applovin-max/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/FumitakaYamada/expo-applovin-max/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/FumitakaYamada/expo-applovin-max/releases/tag/v0.1.0
