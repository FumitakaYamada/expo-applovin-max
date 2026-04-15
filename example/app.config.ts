import * as fs from "node:fs";
import * as path from "node:path";
import type { ExpoConfig } from "@expo/config-types";
import { DEFAULT_SKADNETWORK_IDENTIFIERS } from "@fumitakayamada/expo-applovin-max";

/**
 * Example app for `@fumitakayamada/expo-applovin-max`.
 *
 * On launch it initializes the AppLovin MAX SDK and opens the MAX
 * Mediation Debugger so you can verify that:
 *   - all the mediation adapters you opted into via `networks` are loaded
 *   - SKAdNetwork IDs are present on iOS
 *   - Ad Review (Quality Service) is active when you provide the credentials
 *
 * ─────────────────────────────────────────────────────────────────────
 * Before you build this example on EAS Build, you MUST provide your own:
 *
 *   1. Apple bundle identifier / Android package name (see below)
 *   2. EAS project ID — run `eas init` in this directory, OR add one
 *      manually under extra.eas.projectId
 *   3. An AppLovin SDK Key — set APPLOVIN_SDK_KEY as an environment
 *      variable (shell / EAS env var / .env file). The app boots without
 *      one but the MAX SDK will refuse to initialize.
 *   4. AdMob App IDs — replace the placeholder XXX values below with your
 *      real IDs from https://apps.admob.com. If you do NOT use the Google
 *      mediation adapter, you can delete the admobAppId* fields entirely.
 *
 * Optional (only if you want Ad Review / Quality Service):
 *
 *   5. APPLOVIN_REPORT_KEY env var — Android Ad Review Report Key from
 *      `AppLovin dashboard → Account → Keys → Report Key`. When unset,
 *      Android Ad Review is simply skipped.
 *   6. scripts/AppLovinQualityServiceSetup-ios.rb — iOS Ad Review setup
 *      script downloaded from `AppLovin dashboard → MAX → Ad Review →
 *      Download Setup Script iOS`. Git-ignore it! The script contains an
 *      account-specific API key. When the file is missing, iOS Ad Review
 *      is simply skipped.
 * ─────────────────────────────────────────────────────────────────────
 */

// Read the AppLovin Report Key from the environment so we don't hard-code
// it. Set this via EAS env vars, your shell, or a gitignored .env file
// before building if you want Android Ad Review. When unset, the build
// still succeeds — Android Ad Review is just skipped.
const APPLOVIN_REPORT_KEY = process.env.APPLOVIN_REPORT_KEY ?? "";

// Look for a developer-provided copy of the iOS setup script. The library
// requires its project-relative path. If the file isn't present, we omit
// `iosSetupScriptPath` entirely so the plugin skips iOS Ad Review.
const IOS_SETUP_SCRIPT_REL = "scripts/AppLovinQualityServiceSetup-ios.rb";
const iosSetupScriptExists = fs.existsSync(
	path.join(__dirname, IOS_SETUP_SCRIPT_REL),
);

const adReview =
	APPLOVIN_REPORT_KEY || iosSetupScriptExists
		? {
				...(APPLOVIN_REPORT_KEY
					? { androidReportKey: APPLOVIN_REPORT_KEY }
					: {}),
				...(iosSetupScriptExists
					? { iosSetupScriptPath: IOS_SETUP_SCRIPT_REL }
					: {}),
			}
		: undefined;

const config: ExpoConfig = {
	name: "AppLovinMax Example",
	slug: "expo-applovin-max-example",
	version: "0.0.1",
	orientation: "portrait",
	icon: "./assets/icon.png",
	scheme: "expoapplovinmaxexample",
	newArchEnabled: true,

	ios: {
		// REPLACE with your own bundle identifier before building.
		bundleIdentifier: "com.example.expoapplovinmaxexample",
		supportsTablet: true,
		infoPlist: {
			ITSAppUsesNonExemptEncryption: false,
			NSUserTrackingUsageDescription:
				"This identifier is used to deliver personalized ads to you and to verify ad placements.",
		},
	},

	android: {
		// REPLACE with your own package name before building.
		package: "com.example.expoapplovinmaxexample",
		permissions: [
			"com.google.android.gms.permission.AD_ID",
			"android.permission.INTERNET",
			"android.permission.ACCESS_NETWORK_STATE",
		],
	},

	plugins: [
		[
			"@fumitakayamada/expo-applovin-max",
			{
				// De facto standard for global apps: the six networks that
				// dominate MAX waterfall revenue. Bundle size scales linearly
				// with this list, so trim it to what you actually monetize on.
				networks: ["pangle", "mintegral", "liftoff", "meta", "google", "unity"],

				// REPLACE these AdMob App IDs with your own before building.
				// You can find them at: https://apps.admob.com → your app →
				// App settings → App ID. If you're not using the "google"
				// mediation adapter at all, delete these two lines entirely.
				admobAppIdAndroid: "ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY",
				admobAppIdIOS: "ca-app-pub-XXXXXXXXXXXXXXXX~ZZZZZZZZZZ",

				...(adReview ? { adReview } : {}),

				// Inject the bundled AppLovin MAX SKAdNetwork IDs into Info.plist.
				skAdNetworkItems: DEFAULT_SKADNETWORK_IDENTIFIERS,
			},
		],
		[
			"expo-build-properties",
			{
				ios: {
					// Required for AppLovin SDK + Firebase + most ad SDKs.
					useFrameworks: "static",
				},
				android: {
					compileSdkVersion: 36,
					targetSdkVersion: 36,
					minSdkVersion: 26,
				},
			},
		],
		"expo-router",
	],

	experiments: {
		typedRoutes: true,
	},

	extra: {
		router: {
			origin: false,
		},
		// Run `eas init` in this directory (or manually set your EAS
		// project ID here) before running `eas build`. EAS refuses to
		// build without one.
		//
		// eas: { projectId: "<YOUR_EAS_PROJECT_ID>" },

		// The AppLovin SDK Key is read from the environment so you can
		// pass it in via a gitignored .env file or an EAS environment
		// variable. Export it with:
		//
		//   export APPLOVIN_SDK_KEY="<your key from AppLovin dashboard>"
		//
		// AppLovin SDK keys get baked into the resulting .ipa / .apk
		// binary anyway, so treat them as semi-public, not as secrets.
		applovinSdkKey: process.env.APPLOVIN_SDK_KEY ?? "",
	},
};

export default config;
