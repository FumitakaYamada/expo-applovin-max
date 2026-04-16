# @fumitakayamada/expo-applovin-max

**English** | [日本語](./README.ja.md)

> The missing all-in-one **AppLovin MAX** config plugin for **Expo** managed / EAS workflows.
>
> **Built and tested for Expo SDK 55.** Should also work on SDK 54 (unverified).

[![npm version](https://img.shields.io/npm/v/@fumitakayamada/expo-applovin-max.svg)](https://www.npmjs.com/package/@fumitakayamada/expo-applovin-max)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Integrates **AppLovin MAX** into your Expo project with one plugin entry in `app.config.ts`. Handles the three integration pain points that no existing Expo plugin covers end to end:

1. **Mediation Adapters** — pick from 28+ pre-wired ad networks via short IDs (`networks: ["pangle", "mintegral", "liftoff", "meta", "google", "unity"]` is a reasonable default). The plugin sets up Android Gradle deps, iOS pods, Maven repos, packaging conflict resolution, AdMob App IDs, and `useFrameworks: "static"` xcframework linking fixes for each network you opt into. **Opt-in by design** so you only ship the adapters you actually monetize on — mediation adapters add real bundle size.
2. **Ad Review (Quality Service)** — Android Gradle plugin wiring + iOS installer invocation during prebuild, so AppLovin's MAX Mediation Debugger shows **Ad Review Version ✅**.
3. **SKAdNetwork IDs** — `skAdNetworkItems` parameter (mirroring the `react-native-google-mobile-ads` shape) for injecting identifiers into `Info.plist`. The library exports a `DEFAULT_SKADNETWORK_IDENTIFIERS` constant covering AppLovin MAX and all bundled mediated networks.

Why this library exists:

| Feature | Invertase `react-native-google-mobile-ads` | This library |
| --- | --- | --- |
| SKAdNetwork injection | ✅ via `sk_ad_network_items` (AdMob-oriented, you supply the list) | ✅ same parameter shape, plus a bundled list for AppLovin MAX you can import |
| Mediation adapter setup | ⚠️ AdMob mediation only, docs only — requires manual Pod/Gradle edits | ✅ AppLovin MAX mediation, auto for both Android + iOS |
| AppLovin Ad Review | ❌ not supported | ✅ Android Gradle plugin + iOS installer + xcframework link verification |
| AppLovin MAX support | ❌ AdMob only | ✅ designed for it |

## Table of contents

- [Install](#install)
- [Quick start](#quick-start)
- [Full options reference](#full-options-reference)
- [What the plugin does](#what-the-plugin-does)
- [FAQ](#faq)
- [Troubleshooting](#troubleshooting)
- [Compatibility](#compatibility)
- [Contributing](#contributing)
- [License](#license)

## Install

### 1. Install the packages

```bash
# pnpm (recommended)
pnpm add @fumitakayamada/expo-applovin-max

# npm
npm install @fumitakayamada/expo-applovin-max

# yarn
yarn add @fumitakayamada/expo-applovin-max
```

You also need the AppLovin MAX React Native SDK to actually *show* ads. This plugin only configures native integration; it does not ship the JS SDK.

```bash
pnpm add react-native-applovin-max
```

### 2. (Optional) Download the iOS Ad Review setup script

If you want **Ad Review (Quality Service)** on iOS:

1. Open the AppLovin dashboard: **MAX → Ad Review → Download Setup Script (iOS)**
2. Save the downloaded `AppLovinQualityServiceSetup-ios.rb` into your project (e.g. `scripts/AppLovinQualityServiceSetup-ios.rb`)
3. **Add it to `.gitignore`** — the script contains an account-specific API key embedded at download time. Do NOT commit it to public repos.

```gitignore
# .gitignore
scripts/AppLovinQualityServiceSetup-ios.rb
```

If you skip this step, iOS Ad Review is simply disabled — everything else (mediation adapters, SKAdNetwork, Android Ad Review) still works.

## Quick start

> **💡 `app.config.js` / `app.config.ts` recommended but not required.** Using a JS/TS config lets you `import { DEFAULT_SKADNETWORK_IDENTIFIERS }` from the library, which is the easiest way to inject the bundled SKAdNetwork list. However, if you prefer `app.json`, you can still use this plugin — just pass the `skAdNetworkItems` array manually instead of importing the constant. See the [app.json example](#appjson-example) below.

Minimal `app.config.ts` — pick mediation networks via `networks`, plus the bundled SKAdNetwork list:

```ts
import type { ExpoConfig } from "@expo/config-types";
import { DEFAULT_SKADNETWORK_IDENTIFIERS } from "@fumitakayamada/expo-applovin-max";

export default {
  name: "MyApp",
  slug: "myapp",
  plugins: [
    [
      "@fumitakayamada/expo-applovin-max",
      {
        // A reasonable de facto default for global mobile apps: the six
        // networks that together dominate global MAX waterfall revenue.
        // Pick only the mediation networks you actually monetize on —
        // each entry adds an Android Gradle dep + iOS pod + Maven repo
        // (when needed). The plugin is a no-op for adapters by default,
        // so you ship zero adapter bundle weight unless you opt in.
        networks: ["pangle", "mintegral", "liftoff", "meta", "google", "unity"],

        // Required if "google" or "googleAdManager" is in `networks`.
        admobAppIdAndroid: "ca-app-pub-XXXXXXXX~YYYYYYYY",
        admobAppIdIOS: "ca-app-pub-XXXXXXXX~ZZZZZZZZ",

        // Pass the bundled list as-is — it covers AppLovin MAX and every
        // mediated network this library knows about.
        skAdNetworkItems: DEFAULT_SKADNETWORK_IDENTIFIERS,
      },
    ],
  ],
} satisfies ExpoConfig;
```

The full list of supported network IDs lives in the [Network registry](#network-registry) section below. The plugin warns at prebuild time if you pass an ID it doesn't recognize.

If you're using all 28+ supported networks (rare — most apps need 5–10), import the convenience constant:

```ts
import { ALL_NETWORK_IDS } from "@fumitakayamada/expo-applovin-max";
// ...
networks: ALL_NETWORK_IDS,
```

The `skAdNetworkItems` parameter shape matches Invertase's [`react-native-google-mobile-ads`](https://docs.page/invertase/react-native-google-mobile-ads), so if you've used that plugin before, this should feel familiar.

With **Ad Review** enabled. Android and iOS Ad Review need **two different credentials** (see the [FAQ entry below](#why-do-i-need-a-separate-key-for-android-and-ios)), each of which you obtain from the AppLovin dashboard:

- **Android**: the Report Key string from `AppLovin dashboard → Account → Keys → Report Key`. Paste it as `adReview.androidReportKey`.
- **iOS**: a Ruby file from `AppLovin dashboard → MAX → Ad Review → Download Setup Script (iOS)`. Save it in your project (e.g. `scripts/AppLovinQualityServiceSetup-ios.rb`) and pass its path as `adReview.iosSetupScriptPath`.

You can enable Ad Review for just one platform by providing only the corresponding field — both are independently optional.

```ts
plugins: [
  [
    "@fumitakayamada/expo-applovin-max",
    {
      admobAppIdAndroid: "ca-app-pub-XXXXXXXX~YYYYYYYY",
      admobAppIdIOS: "ca-app-pub-XXXXXXXX~ZZZZZZZZ",
      adReview: {
        // Android — paste the Report Key string directly.
        androidReportKey: "YOUR_REPORT_KEY_HERE",

        // iOS — path (relative to project root) to the Ruby script you
        // downloaded from the AppLovin dashboard. Omit to skip iOS Ad Review.
        iosSetupScriptPath: "scripts/AppLovinQualityServiceSetup-ios.rb",
      },
    },
  ],
],
```

> ⚠️ **Security note:** The iOS setup script contains an API key embedded at download time that identifies your AppLovin account. Treat it like a secret: add it to a private repo, a `.gitignore`d location, or encrypt it. Do NOT commit it to public repos.

### app.json example

If you prefer to stay on static `app.json`, you can use this plugin without any imports — just list the SKAdNetwork identifiers manually:

```json
{
  "expo": {
    "plugins": [
      [
        "@fumitakayamada/expo-applovin-max",
        {
          "networks": ["pangle", "mintegral", "liftoff", "meta", "google", "unity"],
          "admobAppIdAndroid": "ca-app-pub-XXXXXXXX~YYYYYYYY",
          "admobAppIdIOS": "ca-app-pub-XXXXXXXX~ZZZZZZZZ",
          "skAdNetworkItems": [
            "cstr6suwn9.skadnetwork",
            "4fzdc2evr5.skadnetwork",
            "...paste the full list here..."
          ]
        }
      ]
    ]
  }
}
```

The trade-off: you lose the convenience of `DEFAULT_SKADNETWORK_IDENTIFIERS` (which bundles 266+ identifiers and stays up to date with library releases) and have to maintain the list yourself. For the full list, see: <https://support.axon.ai/en/max/react-native/overview/skadnetwork>

After adding the plugin, clear any cached native project and rebuild:

```bash
pnpm expo prebuild --clean
eas build --platform ios --profile production
eas build --platform android --profile production
```

## Full options reference

```ts
[
  "@fumitakayamada/expo-applovin-max",
  {
    /**
     * AdMob App IDs. Required if the Google mediation adapter is enabled
     * (it is by default). Without these, the app crashes at launch with
     * "Missing application ID".
     *
     * Get them from the AdMob console:
     *   https://apps.admob.com → your app → App settings → App ID
     */
    admobAppIdAndroid: "ca-app-pub-XXX~YYY",
    admobAppIdIOS: "ca-app-pub-XXX~ZZZ",

    /**
     * Ad Review (AppLovin Quality Service). Optional.
     *
     * Android and iOS Ad Review each require a DIFFERENT credential —
     * they are NOT the same string in different formats. See the
     * "Why do I need a separate key for Android and iOS?" FAQ below.
     *
     * You can enable Ad Review on one platform, both, or neither. To
     * disable Ad Review entirely, omit the `adReview` key.
     *
     * androidReportKey:
     *   Report Key from AppLovin dashboard → Account → Keys → Report Key.
     *   Plain string. Written into the `applovin { apiKey "..." }` block
     *   in app/build.gradle. Omit to skip Android Ad Review.
     *
     * iosSetupScriptPath:
     *   Path relative to the project root to a copy of
     *   AppLovinQualityServiceSetup-ios.rb that you downloaded from:
     *     AppLovin dashboard → MAX → Ad Review → Download Setup Script iOS
     *   This file contains its OWN embedded key (different from
     *   androidReportKey) that AppLovin injects at download time. Cannot
     *   be bundled with this library — each publisher must download and
     *   commit their own copy. Omit to skip iOS Ad Review.
     *
     * `apiKey` is also accepted as a legacy alias for `androidReportKey`
     * to keep parity with @crassaert/applovin-quality-service-expo-plugin.
     */
    adReview: {
      androidReportKey: "YOUR_REPORT_KEY",
      iosSetupScriptPath: "scripts/AppLovinQualityServiceSetup-ios.rb",
    },

    /**
     * RECOMMENDED. Pick mediation networks by short ID. Each entry adds
     * the Android Gradle dep, iOS pod, and Maven repo for that network.
     * The plugin is a no-op for adapters unless you opt in.
     *
     * A reasonable de facto default is
     *   ["pangle", "mintegral", "liftoff", "meta", "google", "unity"]
     * — the six networks that together dominate global MAX waterfall
     * revenue for most app categories. Trim or extend this list to
     * match your actual eCPM data from the AppLovin dashboard.
     *
     * See the "Network registry" section below for the full list of IDs.
     * Pass [] to skip adapters entirely (e.g. if you only want
     * SKAdNetwork or Ad Review without bundled networks).
     */
    networks: ["pangle", "mintegral", "liftoff", "meta", "google", "unity"],

    /**
     * ADVANCED override. If set, REPLACES whatever `networks` would
     * generate for Android. Use this to pin versions, ship custom
     * adapters, or add extra deps not in the registry.
     *
     * Each entry: { name: string, version?: string, extraDependencies?: string[] }
     *   - name: the artifactId under `com.applovin.mediation:`
     *   - version: defaults to "+"
     *   - extraDependencies: full Gradle coordinates, e.g. ["com.amazon.android:aps-sdk:+"]
     */
    androidAdapters: [
      { name: "google-adapter", version: "+" },
      { name: "amazon-tam-adapter", extraDependencies: ["com.amazon.android:aps-sdk:+"] },
    ],

    /**
     * ADVANCED override. If set, REPLACES whatever `networks` would
     * generate for iOS.
     *
     * Each entry: { name: string, version?: string }
     *   - name: the CocoaPods pod name
     */
    iosPods: [
      { name: "AmazonPublisherServicesSDK" },
      { name: "AppLovinMediationGoogleAdapter" },
    ],

    /**
     * ADVANCED override for Android Maven repositories. If set, REPLACES
     * whatever `networks` would generate. Useful if you're adding a
     * custom adapter that hosts its artifacts elsewhere or you need a
     * private mirror.
     *
     * Each repo should have a `regex` that scopes it via
     * includeGroupByRegex to avoid polluting the global resolver.
     */
    mavenRepositories: [
      { url: "https://example.com/maven", regex: "com\\\\.example.*" },
    ],

    /**
     * If true, skip the Podfile post_install hook that fixes xcframework
     * linking with useFrameworks: "static". Only set this if you have
     * your own fix. Default: false.
     */
    disableIOSFrameworkLinkingFix: false,

    /**
     * SKAdNetwork identifiers to inject into Info.plist as the
     * `SKAdNetworkItems` array. Mirrors the parameter shape of Invertase's
     * `react-native-google-mobile-ads` plugin so it should feel familiar.
     *
     * Pass a flat array of identifier strings. The library does NOT
     * auto-apply defaults — if you want the bundled list, import and pass
     * `DEFAULT_SKADNETWORK_IDENTIFIERS` explicitly:
     *
     *   import { DEFAULT_SKADNETWORK_IDENTIFIERS } from "@fumitakayamada/expo-applovin-max";
     *
     *   plugins: [
     *     ["@fumitakayamada/expo-applovin-max", {
     *       skAdNetworkItems: DEFAULT_SKADNETWORK_IDENTIFIERS,
     *     }],
     *   ]
     *
     * The bundled list is sourced from AppLovin's official MAX docs:
     * https://support.axon.ai/en/max/react-native/overview/skadnetwork
     *
     * To extend it with your own IDs, spread it:
     *   skAdNetworkItems: [...DEFAULT_SKADNETWORK_IDENTIFIERS, "abc.skadnetwork"]
     *
     * Omit this option entirely to skip SKAdNetwork injection.
     */
    skAdNetworkItems: [
      "cstr6suwn9.skadnetwork",
      "4fzdc2evr5.skadnetwork",
      // ... etc
    ],
  },
]
```

All options are optional. The plugin is a complete no-op if you set none of `networks` / `androidAdapters` / `iosPods` / `adReview` / `skAdNetworkItems`.

When `networks` includes `"google"` or `"googleAdManager"`, you must also set `admobAppIdAndroid` and `admobAppIdIOS` — otherwise the app crashes at launch with `"Missing application ID"`.

When `adReview` is set, at least one of `adReview.androidReportKey` or `adReview.iosSetupScriptPath` must be provided — but you can pick either platform independently.

## Network registry

The `networks` option accepts these short IDs. Each one maps to an Android Gradle dependency + iOS CocoaPods pod + (optionally) a Maven repository. The plugin handles the wiring so your `app.config.ts` stays clean.

| Network ID | Display name | Android | iOS |
| --- | --- | --- | --- |
| `amazon` | Amazon Publisher Services | ✅ + APS base SDK | ✅ + `AmazonPublisherServicesSDK` |
| `bidmachine` | BidMachine | ✅ | ✅ |
| `bigoads` | BIGO Ads | ✅ | ✅ |
| `chartboost` | Chartboost | ✅ | ✅ |
| `csj` | CSJ (Pangle China) | — | ✅ |
| `fyber` | DT Exchange (Fyber) | ✅ | ✅ |
| `googleAdManager` | Google Ad Manager | ✅ | ✅ |
| `google` | Google AdMob / Google Bidding | ✅ | ✅ |
| `hyprmx` | HyprMX | ✅ | ✅ |
| `inmobi` | InMobi | ✅ + Picasso + RecyclerView | ✅ |
| `ironsource` | ironSource | ✅ | ✅ |
| `liftoff` | Liftoff Monetize (Vungle) | ✅ | ✅ |
| `line` | LINE | ✅ | ✅ |
| `maio` | Maio | ✅ | ✅ |
| `meta` | Meta Audience Network (Facebook) | ✅ | ✅ |
| `mintegral` | Mintegral | ✅ | ✅ |
| `mobilefuse` | MobileFuse | ✅ | ✅ |
| `moloco` | Moloco | ✅ | ✅ |
| `mytarget` | myTarget | ✅ | ✅ |
| `ogury` | Ogury | ✅ | ✅ |
| `pangle` | Pangle (ByteDance) | ✅ | ✅ |
| `pubmatic` | PubMatic | ✅ | ✅ |
| `smaato` | Smaato | ✅ | ✅ |
| `tencent` | Tencent GDT | — | ✅ |
| `unity` | Unity Ads | ✅ | ✅ |
| `verve` | Verve | ✅ | ✅ |
| `vk` | VK Ad Network | ✅ | — |
| `yandex` | Yandex | ✅ | ✅ |
| `yso` | YSO Network | ✅ | ✅ |

Source: [AppLovin MAX official "Preparing mediated networks" docs](https://developers.applovin.com/en/max/preparing-mediated-networks/) for both Android and iOS. List current as of 2026-04.

If you need a network that isn't in this table, use the `androidAdapters` / `iosPods` / `mavenRepositories` advanced overrides instead, and please open an issue or PR to add it to the registry.

> ⚠️ **Bundle size matters.** Each enabled network adds ~1–10 MB to the binary. The full set is 28+ networks and would balloon your APK / IPA significantly. Only enable networks you actively serve ads from. The `networks` array exists specifically so you can opt into a tight subset.

## What the plugin does

### Mediation Adapters

The `withAppLovinMediationAdapters` sub-plugin is **opt-in**. Pass a `networks` array (or the more advanced `androidAdapters` / `iosPods` overrides) to specify which mediated ad networks to integrate. By default, when neither `networks` nor the per-platform arrays are set, the plugin adds nothing — keeping bundle size flat for apps that only want SKAdNetwork or Ad Review.

For each network you enable, the plugin handles:

**Android** (when the network has an Android artifact)

- Adds `implementation("com.applovin.mediation:<artifact>:+")` for the corresponding adapter to `app/build.gradle`, plus any extra dependencies the network needs (e.g. Amazon TAM also adds `com.amazon.android:aps-sdk:+`, InMobi adds `com.squareup.picasso:picasso:2.8` and `androidx.recyclerview:recyclerview:1.1.0`).
- Adds the network's Maven repository to both `settings.gradle` (`dependencyResolutionManagement`) and project `build.gradle` (`allprojects`), each scoped with `includeGroupByRegex` so Gradle only consults network-specific repos for their own artifacts.
- Adds `packagingOptions { pickFirst "lib/*/libc++_shared.so" ... }` once to resolve duplicate `.so` files shipped by multiple adapters (Pangle, Mintegral, ironSource).
- Adds the `com.google.android.gms.ads.APPLICATION_ID` meta-data entry to `AndroidManifest.xml` using `admobAppIdAndroid` (only when you explicitly set it).

**iOS** (when the network has an iOS pod)

- Adds `pod 'AppLovinMediationXxxAdapter'` for each adapter to the Podfile's main target, plus any extra base pods the network needs (e.g. `AmazonPublisherServicesSDK` for the APS adapter, inserted before the adapter pod so it's available as a dep).
- Adds `GADApplicationIdentifier` to `Info.plist` using `admobAppIdIOS` (only when you explicitly set it).
- Adds a Podfile `post_install` hook (skip with `disableIOSFrameworkLinkingFix: true`) that:
  - Sets `LD_RUNPATH_SEARCH_PATHS` and `FRAMEWORK_SEARCH_PATHS` defaults.
  - Ensures `OTHER_LDFLAGS` includes `-ObjC` (required for category-based mediation adapters).
  - Disables code signing on bundle targets (some adapters ship `.bundle` resources).
  - Patches `APSiOSSharedLib.framework/Info.plist` to add `CFBundleShortVersionString` and `CFBundleVersion`, since App Store Connect rejects binaries whose embedded frameworks lack these keys.

### Ad Review (Quality Service) — optional

The `withAppLovinQualityService` sub-plugin (only when `adReview.apiKey` is set):

**Android**

- Adds AppLovin's Maven repo to `buildscript { repositories }` in project `build.gradle`.
- Adds `classpath 'com.applovin.quality:AppLovinQualityServiceGradlePlugin:+'` to `buildscript { dependencies }`.
- Appends `apply plugin: 'applovin-quality-service'` and `applovin { apiKey "..." }` to `app/build.gradle`.

**iOS**

- Copies the bundled `AppLovinQualityServiceSetup-ios.rb` into `ios/` during prebuild.
- Runs `ruby AppLovinQualityServiceSetup-ios.rb install` from `ios/` to download `AppLovinQualityService.xcframework` and add it to `app.xcodeproj` (Link Binary, Embed, Run Script build phase for auto-update).
- Verifies via the `xcode` package that the framework is present in both the **Link Binary With Libraries** and **Embed Frameworks** build phases, adding it if missing. This hardening exists because empirically the AppLovin installer alone has been observed to embed the framework without linking it, which silently breaks Ad Review at runtime (MAX Mediation Debugger shows **Ad Review Version ❌** even though the framework is in the `.app` bundle).

The iOS installer runs during **`expo prebuild`**, not from an `eas-build-post-install` npm hook. This matters because the EAS Build phase order is `PREBUILD → INSTALL_PODS → POST_INSTALL_HOOK → RUN_FASTLANE` — running in prebuild means xcodeproj changes are in place before pod install and fastlane read the project, so you don't need any `eas-build-post-install` configuration in your consuming project. One less thing to wire up.

**macOS only:** The AppLovin installer extracts and executes an embedded Mach-O binary. On non-macOS hosts the plugin copies the script but skips the installer step with a warning. This does not matter in practice because `expo prebuild --platform ios` is unsupported off macOS anyway; it only affects local dev flows that run prebuild for both platforms on Windows/Linux.

### SKAdNetwork IDs

The `withSKAdNetwork` sub-plugin takes a flat array of `SKAdNetworkIdentifier` strings via the `skAdNetworkItems` option and merges them into `Info.plist`'s `SKAdNetworkItems` array. The parameter shape matches Invertase's `react-native-google-mobile-ads` (`sk_ad_network_items`) so it should feel familiar.

This plugin does NOT auto-apply any defaults — you must pass an array. To use the bundled list of 266+ identifiers covering AppLovin MAX and all bundled mediated networks, import it explicitly:

```ts
import { DEFAULT_SKADNETWORK_IDENTIFIERS } from "@fumitakayamada/expo-applovin-max";

// in plugins array
skAdNetworkItems: DEFAULT_SKADNETWORK_IDENTIFIERS,
```

The bundled list is sourced directly from AppLovin's official MAX React Native docs:

> 📖 [AppLovin MAX SKAdNetwork docs](https://support.axon.ai/en/max/react-native/overview/skadnetwork)

It covers AppLovin, Amazon, BidMachine, DT Exchange (Fyber), Google AdMob / Google Bidding, InMobi, ironSource, Liftoff Monetize (Vungle), Meta Audience Network (Facebook), Mintegral, Pangle (ByteDance), Unity Ads, and a long tail of additional networks. The identifiers are deduplicated and sorted before injection.

If you only ship some of the mediation networks, or AppLovin adds new ones after a library release, just pass your own array (or extend the bundled one):

```ts
// Replace entirely
skAdNetworkItems: ["cstr6suwn9.skadnetwork", "4fzdc2evr5.skadnetwork"]

// Or extend
skAdNetworkItems: [
  ...DEFAULT_SKADNETWORK_IDENTIFIERS,
  "newNetwork123.skadnetwork",
]
```

The plugin deduplicates against any `SKAdNetworkItems` already present in your `Info.plist`, so it's safe to compose with other config plugins or with manual entries.

## FAQ

### Do I need to commit anything to `ios/` or `android/`?

No. This is a managed workflow plugin. It modifies the `ios/` and `android/` directories that `expo prebuild` (or EAS Build) generates from scratch each time. Your Git working tree remains clean.

### Why does the iOS installer need macOS?

Because AppLovin ships the installer as an embedded Mach-O binary inside the Ruby script. There's nothing this library can do about that. Luckily EAS iOS builds run on macOS, so it just works.

### Does this work with `useFrameworks: "static"`?

Yes — that's specifically what this library targets. The mediation adapters sub-plugin includes Podfile `post_install` fixes that handle the xcframework linking issues static frameworks cause with vendored frameworks (notably Amazon APS's DTBiOSSDK).

If you're using `useFrameworks: "dynamic"` or the default, the fixes are still applied but should be no-ops.

### Can I use only a subset of the features?

Yes.

- To disable SKAdNetwork: `skAdNetwork: { disabled: true }`
- To disable Ad Review: omit `adReview`
- To use only some mediation adapters: `androidAdapters: [...subset]`, `iosPods: [...subset]`
- To skip adding any adapter dependencies: `androidAdapters: []`, `iosPods: []`
- The sub-plugins are also exported individually (`withAppLovinMediationAdapters`, `withAppLovinQualityService`, `withSKAdNetwork`) for advanced composition.

### Why is this tied to Expo 55?

It isn't, strictly. The core integration logic is SDK-agnostic, but the specific pitfalls it works around (xcframework linking with static frameworks, Podfile regex targeting, Gradle 8.x `dependencyResolutionManagement`) were all verified against Expo SDK 55 production builds. Earlier SDKs *should* work but are unverified.

### I already have `@crassaert/applovin-quality-service-expo-plugin`. Can I remove it?

Yes — this library replaces it entirely, and it also fixes the Expo 55 incompatibility where `@crassaert`'s build.gradle regex no longer matches. Remove `@crassaert/applovin-quality-service-expo-plugin` from your `package.json`, delete its entry from your `app.config.ts` plugins array, and add the Ad Review configuration to this plugin instead.

### Why do I need a separate key for Android and iOS?

Because AppLovin issues **two distinct credentials** for Ad Review, one per platform. Both belong to the same AppLovin account but are different strings with different purposes:

- **Android** uses a "Report Key" that you copy-paste from the dashboard into `applovin { apiKey "..." }` in your Gradle config. It's used by the `applovin-quality-service` Gradle plugin to authenticate with AppLovin's Quality Service at app build time. Plain 86-character string.
- **iOS** uses a Ruby setup script (`AppLovinQualityServiceSetup-ios.rb`) that AppLovin generates per-account. The script contains a DIFFERENT 86-character key embedded in a JSON block, which it uses to authenticate with `api2.safedk.com` to download the Quality Service xcframework at install time. You cannot paste this string into a config — the whole script ships with it embedded.

If you diff two copies of the iOS script from two different AppLovin accounts, the only line that differs is the `"api_key": "..."` field inside the `APPLICATION_DATA` JSON block (the script even has a comment above it saying `# Developer-specific ID`). The rest of the script, including the embedded macOS installer binary, is identical across accounts. But the Android Report Key is a separate string issued by the AppLovin dashboard — it's not derived from the iOS one (or vice versa).

So the plugin asks for both if you want Ad Review on both platforms. If you only ship Android, only pass `androidReportKey`. If you only ship iOS, only pass `iosSetupScriptPath`. No dummy values needed.

### Why do I have to manage the iOS setup script myself?

The Ruby script `AppLovinQualityServiceSetup-ios.rb` that you download from the AppLovin dashboard has an account-specific API key **embedded inside it** at download time. Shipping a single copy of the script as part of this library would leak whichever AppLovin account was used to download it to every consumer of the library. That's a security no-go, so the library is intentionally designed so each user brings their own copy.

Treat the script as a secret:

- If your repo is **private**, committing it is fine.
- If your repo is **public**, either `.gitignore` it and provide it via CI secret + a prebuild hook, or use `git-crypt` / `git-secret` / similar. Do not commit the plaintext script to a public repo.

The script contains a self-update mechanism that refreshes the embedded SDK at Xcode build time, so once you have a copy there's usually no need to re-download it unless AppLovin bumps the major version of the setup script itself.

## Troubleshooting

### "Missing application ID" crash at launch

You enabled the Google adapter (default) but did not set `admobAppIdAndroid` / `admobAppIdIOS`. Either set them or remove `google-adapter` / `AppLovinMediationGoogleAdapter` from your adapter lists.

### MAX Mediation Debugger shows "Ad Review Version ❌"

The AppLovin installer may have embedded `AppLovinQualityService.xcframework` without linking it. This library's `ensureXcframeworkLinked` step should fix it, but if you see it anyway:

1. Check the EAS Build logs during the `PREBUILD` phase for lines starting with `[AppLovinQualityService]`. They should show `linked=true, embedded=true` at the end.
2. If the installer failed with `Installer exited with error`, check that `scripts/AppLovinQualityServiceSetup-ios.rb` ran successfully. A common failure is network issues downloading the pod from `api2.safedk.com`.
3. Verify your `adReview.apiKey` is correct. A wrong key silently succeeds at prebuild but disables Ad Review at runtime.

### Android Gradle: "Could not find com.applovin.quality:AppLovinQualityServiceGradlePlugin"

The AppLovin Maven repo was not added to `buildscript { repositories }`. This shouldn't happen with this plugin — please open an issue with your `android/build.gradle` attached.

### iOS Pod install fails on a specific adapter

Individual adapters occasionally have transient issues. Try:

1. Pinning the adapter to a specific version: `iosPods: [{ name: "AppLovinMediationXxxAdapter", version: "1.2.3" }, ...]`
2. Removing it temporarily: `iosPods: [...allPodsExceptXxx]`
3. Running `pod repo update` locally (EAS Build does this automatically).

### `useFrameworks: "static"` + Firebase combo

If you're combining this plugin with `@react-native-firebase/app` and using `useFrameworks: "static"`, make sure you're on `expo-modules-core@55.0.22+` — earlier versions have a broken `#import <React/React-Core-umbrella.h>` that fails with static frameworks. This library does not fix that issue; it's separate from AppLovin integration.

## Compatibility

| Package version | Expo SDK | React Native | New Architecture | Notes |
| --- | --- | --- | --- | --- |
| 0.1.x | 55 (verified) | 0.83.x | ✅ required (Expo 55 mandates it) | Primary target. Used in production. |
| 0.1.x | 54 | 0.76.x | ✅ optional | Expected to work, unverified. File an issue if you hit problems. |

`peerDependencies` requires `expo >= 54.0.0` but the library is only actively verified against SDK 55. Post an issue (or PR) if you use an older SDK and want official support.

### New Architecture

This plugin is **transparent to the New Architecture** mandated by Expo SDK 55. It only modifies build configuration files (`AndroidManifest.xml`, `Info.plist`, `Podfile`, `build.gradle`) at prebuild time — it does not add or modify any React Native runtime code. There is nothing for the New Architecture interop layer (Fabric / TurboModules / codegen) to break.

If you're upgrading from an older SDK, the only thing to make sure of is that your AppLovin MAX React Native SDK version (`react-native-applovin-max` or whichever package you use) is itself NewArch-compatible. That's outside the scope of this plugin.

### Config Plugin design notes

The plugin follows Expo's recommendation to prefer **safe mods** (structured AST-aware modifications) over `withDangerousMod` whenever possible. Concretely:

| Native file | Mod used | Type |
| --- | --- | --- |
| `Info.plist` (SKAdNetwork, AdMob ID) | `withInfoPlist` | safe |
| `AndroidManifest.xml` (AdMob ID) | `withAndroidManifest` | safe |
| `android/build.gradle` (Maven repos, classpath) | `withProjectBuildGradle` | safe (string) |
| `android/app/build.gradle` (adapter deps, plugin apply) | `withAppBuildGradle` | safe (string) |
| `android/settings.gradle` (Maven repos for `dependencyResolutionManagement`) | `withSettingsGradle` | safe (string) |
| `ios/Podfile` (mediation pods, post_install) | `withPodfile` | safe wrapper around `withDangerousMod` |
| `ios/Podfile` + AppLovin Ruby script execution | `withDangerousMod` | dangerous |
| `ios/<App>.xcodeproj/project.pbxproj` (verify Ad Review xcframework link) | `withXcodeProject` | safe |

The only `withDangerousMod` use is for invoking the AppLovin Quality Service installer (`ruby AppLovinQualityServiceSetup-ios.rb install`) during prebuild, because Expo does not expose a structured way to run an external script as part of a Podfile mod. Even there, the modifications themselves go through Expo's normal Podfile + Xcode project handling — `withDangerousMod` is just the entry point.

## Contributing

Issues and PRs welcome at <https://github.com/FumitakaYamada/expo-applovin-max>. When reporting a bug, please include:

- Your `app.config.ts` plugin entry (redact API keys)
- Expo SDK version and the output of `expo --version`
- The relevant EAS Build log phase (usually `PREBUILD` or `INSTALL_PODS`)
- Your `useFrameworks` setting if applicable

## License

MIT © [Fumitaka Yamada](https://github.com/FumitakaYamada)

AppLovin, MAX, and the AppLovin Quality Service are trademarks of AppLovin Corporation. This library is not affiliated with, endorsed by, or sponsored by AppLovin. It simply automates the documented integration steps that their official docs describe.
