import type { ConfigPlugin, ExpoConfig } from "@expo/config-plugins";

// ---------------------------------------------------------------------------
// Network registry
// ---------------------------------------------------------------------------

export interface NetworkEntry {
	displayName: string;
	androidArtifact?: string;
	androidExtraDependencies?: string[];
	iosPod?: string;
	iosExtraPods?: string[];
	mavenRepo?: { url: string; regex: string };
}

export type NetworkId =
	| "amazon"
	| "bidmachine"
	| "bigoads"
	| "chartboost"
	| "csj"
	| "fyber"
	| "googleAdManager"
	| "google"
	| "hyprmx"
	| "inmobi"
	| "ironsource"
	| "liftoff"
	| "line"
	| "maio"
	| "meta"
	| "mintegral"
	| "mobilefuse"
	| "moloco"
	| "mytarget"
	| "ogury"
	| "pangle"
	| "pubmatic"
	| "smaato"
	| "tencent"
	| "unity"
	| "verve"
	| "vk"
	| "yandex"
	| "yso";

export declare const NETWORK_REGISTRY: Record<NetworkId, NetworkEntry>;
export declare const ALL_NETWORK_IDS: readonly NetworkId[];

// ---------------------------------------------------------------------------
// Plugin options
// ---------------------------------------------------------------------------

export interface AdReviewOptions {
	androidReportKey?: string;
	iosSetupScriptPath?: string;
	/** Legacy alias for `androidReportKey`. */
	apiKey?: string;
}

export interface ExpoAppLovinMaxOptions {
	admobAppIdAndroid?: string;
	admobAppIdIOS?: string;
	adReview?: AdReviewOptions;
	networks?: NetworkId[];
	androidAdapters?: Array<{
		name: string;
		version?: string;
		extraDependencies?: string[];
	}>;
	iosPods?: Array<{ name: string; version?: string }>;
	mavenRepositories?: Array<{ url: string; regex: string }>;
	disableIOSFrameworkLinkingFix?: boolean;
	skAdNetworkItems?: string[];
}

// ---------------------------------------------------------------------------
// Sub-plugins
// ---------------------------------------------------------------------------

export declare const withAppLovinMediationAdapters: ConfigPlugin<{
	admobAppIdAndroid?: string;
	admobAppIdIOS?: string;
	networks?: NetworkId[];
	androidAdapters?: ExpoAppLovinMaxOptions["androidAdapters"];
	iosPods?: ExpoAppLovinMaxOptions["iosPods"];
	mavenRepositories?: ExpoAppLovinMaxOptions["mavenRepositories"];
	disableIOSFrameworkLinkingFix?: boolean;
}>;

export declare const withAppLovinQualityService: ConfigPlugin<AdReviewOptions>;

export declare const withSKAdNetwork: ConfigPlugin<{
	skAdNetworkItems?: string[];
}>;

// ---------------------------------------------------------------------------
// SKAdNetwork identifiers
// ---------------------------------------------------------------------------

/**
 * Bundled list of SKAdNetwork identifiers covering AppLovin MAX and all
 * mediated networks. Pass to `skAdNetworkItems` so you don't have to
 * maintain the list yourself.
 *
 * @see https://support.axon.ai/en/max/react-native/overview/skadnetwork
 */
export declare const DEFAULT_SKADNETWORK_IDENTIFIERS: readonly string[];

// ---------------------------------------------------------------------------
// Main config plugin (default export)
// ---------------------------------------------------------------------------

declare const withExpoAppLovinMax: ConfigPlugin<ExpoAppLovinMaxOptions>;
export default withExpoAppLovinMax;
