/**
 * @fumitakayamada/expo-applovin-max
 *
 * Expo config plugin that handles the three integration pain points of
 * AppLovin MAX in Expo managed / EAS workflows:
 *
 *   1. Mediation Adapters — 11 pre-wired networks for Android and iOS with
 *      Maven repos, AdMob App IDs, packaging fixes, and xcframework linking
 *      fixes for useFrameworks: "static".
 *   2. Ad Review (AppLovin Quality Service) — Android Gradle plugin wiring
 *      and iOS installer invocation + post-install xcframework link
 *      verification. Optional, opt-in via `adReview`.
 *   3. SKAdNetwork IDs — pass an array of identifiers via `skAdNetworkItems`
 *      to inject them into Info.plist. The library exports
 *      `DEFAULT_SKADNETWORK_IDENTIFIERS` covering AppLovin MAX and all
 *      bundled mediated networks; reference it explicitly to enable that
 *      list.
 *
 * Design notes:
 *   - All native modifications are done via Expo Config Plugin "safe mods"
 *     (withInfoPlist, withAndroidManifest, withAppBuildGradle,
 *     withProjectBuildGradle, withSettingsGradle) wherever possible. The
 *     ONLY use of withDangerousMod is for the iOS Quality Service installer
 *     because Expo does not expose a structured Podfile mod that supports
 *     running an external Ruby script.
 *   - The plugin is pure config-time: it only modifies build files. No
 *     runtime React Native code is added. This makes it transparently
 *     compatible with the New Architecture (Fabric / TurboModules)
 *     mandated by Expo SDK 55 — there is nothing in the plugin that the
 *     New Architecture interop layer could break.
 *   - On every prebuild the plugin starts from a clean slate (Expo
 *     regenerates ios/ and android/), so changes are always re-applied
 *     from scratch.
 *
 * See README.md for the full options reference and usage examples.
 */

const { withPlugins } = require("@expo/config-plugins");

const withAppLovinMediationAdapters = require("./withAppLovinMediationAdapters");
const withAppLovinQualityService = require("./withAppLovinQualityService");
const withSKAdNetwork = require("./withSKAdNetwork");
const NETWORK_REGISTRY = require("./networkRegistry");

/**
 * @typedef {object} ExpoAppLovinMaxOptions
 *
 * @property {string} [admobAppIdAndroid]
 *   AdMob Application ID for Android (e.g. `"ca-app-pub-XXX~YYY"`).
 *   Required if you enable the Google mediation network. Without it, the
 *   app crashes at launch with `"Missing application ID"`.
 *
 * @property {string} [admobAppIdIOS]
 *   AdMob Application ID for iOS. Same requirement as above.
 *
 * @property {{ androidReportKey?: string, iosSetupScriptPath?: string, apiKey?: string }} [adReview]
 *   Ad Review (AppLovin Quality Service) configuration. Optional. Android
 *   and iOS each require a DIFFERENT credential — see README's FAQ "Why do
 *   I need a separate key for Android and iOS?" for the full explanation.
 *   At least one of `androidReportKey` or `iosSetupScriptPath` must be
 *   set when `adReview` is provided. `apiKey` is accepted as a legacy
 *   alias for `androidReportKey`.
 *
 * @property {string[]} [networks]
 *   Recommended way to pick mediation adapters. Pass an array of short
 *   network IDs (`"google"`, `"meta"`, `"unity"`, etc.) and the plugin
 *   handles Android Gradle deps + iOS pods + Maven repos for you. Bundle
 *   size grows roughly linearly with the number of networks enabled, so
 *   pick only what you actually monetize on. The full list of supported
 *   IDs lives in `NETWORK_REGISTRY` (also exported as `ALL_NETWORK_IDS`).
 *
 *   Default: `[]` — the plugin is a no-op for adapters unless you opt
 *   in. This matches `react-native-google-mobile-ads`'s philosophy of
 *   not bundling anything you didn't ask for.
 *
 * @property {Array<{ name: string, version?: string, extraDependencies?: string[] }>} [androidAdapters]
 *   Advanced override. If set, REPLACES whatever `networks` would
 *   generate for Android. Use this to pin versions, add custom
 *   adapters, or ship deps not in the registry.
 *
 * @property {Array<{ name: string, version?: string }>} [iosPods]
 *   Advanced override. If set, REPLACES whatever `networks` would
 *   generate for iOS.
 *
 * @property {Array<{ url: string, regex: string }>} [mavenRepositories]
 *   Advanced override for Android Maven repos.
 *
 * @property {boolean} [disableIOSFrameworkLinkingFix]
 *   If true, skip the post_install hook that fixes xcframework linking
 *   with useFrameworks: "static". Only set this if you already have your
 *   own linking fix in place.
 *
 * @property {string[]} [skAdNetworkItems]
 *   Array of SKAdNetwork identifier strings to inject into the
 *   `SKAdNetworkItems` array in Info.plist. Mirrors the parameter shape
 *   used by `react-native-google-mobile-ads`. If omitted or empty, no
 *   SKAdNetwork entries are injected — the plugin does NOT auto-apply
 *   defaults.
 *
 *   To use the bundled list of identifiers covering AppLovin MAX and all
 *   mediated networks, import it explicitly:
 *
 *     import { DEFAULT_SKADNETWORK_IDENTIFIERS } from "@fumitakayamada/expo-applovin-max";
 *     // ...
 *     skAdNetworkItems: DEFAULT_SKADNETWORK_IDENTIFIERS
 */

/**
 * @param {import('@expo/config-plugins').ExpoConfig} config
 * @param {ExpoAppLovinMaxOptions} [options]
 */
function withExpoAppLovinMax(config, options = {}) {
	const plugins = [];

	// Mediation adapters — opt-in via `networks` or per-platform overrides.
	// Pass through admobAppId* even when no networks are set, so users who
	// only want SKAdNetwork still get a sensible warning if they enable
	// Google later.
	plugins.push([
		withAppLovinMediationAdapters,
		{
			admobAppIdAndroid: options.admobAppIdAndroid,
			admobAppIdIOS: options.admobAppIdIOS,
			networks: options.networks,
			androidAdapters: options.androidAdapters,
			iosPods: options.iosPods,
			mavenRepositories: options.mavenRepositories,
			disableIOSFrameworkLinkingFix: options.disableIOSFrameworkLinkingFix,
		},
	]);

	// Ad Review — opt-in, requires at least one of androidReportKey or
	// iosSetupScriptPath
	if (options.adReview) {
		plugins.push([withAppLovinQualityService, options.adReview]);
	}

	// SKAdNetwork — opt-in, only runs if `skAdNetworkItems` is provided
	if (options.skAdNetworkItems && options.skAdNetworkItems.length > 0) {
		plugins.push([
			withSKAdNetwork,
			{ skAdNetworkItems: options.skAdNetworkItems },
		]);
	}

	return withPlugins(config, plugins);
}

module.exports = withExpoAppLovinMax;

// Sub-plugins are also exported so advanced users can compose them manually
module.exports.withAppLovinMediationAdapters = withAppLovinMediationAdapters;
module.exports.withAppLovinQualityService = withAppLovinQualityService;
module.exports.withSKAdNetwork = withSKAdNetwork;

// Re-export the bundled SKAdNetwork identifier list so users can pass it
// to `skAdNetworkItems` without having to maintain it themselves.
//
// Source: AppLovin MAX SKAdNetwork docs:
//   https://support.axon.ai/en/max/react-native/overview/skadnetwork
module.exports.DEFAULT_SKADNETWORK_IDENTIFIERS =
	withSKAdNetwork.DEFAULT_SKADNETWORK_IDENTIFIERS;

// Re-export the network registry so users can introspect supported networks
// or look up canonical names for advanced overrides.
module.exports.NETWORK_REGISTRY = NETWORK_REGISTRY;
module.exports.ALL_NETWORK_IDS = NETWORK_REGISTRY.ALL_NETWORK_IDS;
