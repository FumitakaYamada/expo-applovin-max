/**
 * AppLovin MAX Mediation Network registry.
 *
 * One entry per mediated ad network. Each entry maps a short network ID
 * (used in user config) to:
 *
 *   - androidArtifact: the artifactId under `com.applovin.mediation:` for
 *     the Android Gradle dependency. Omit for iOS-only networks.
 *   - androidExtraDependencies: optional extra Android dependencies that
 *     the adapter requires (e.g. Amazon TAM needs the APS base SDK as a
 *     separate Maven dep).
 *   - iosPod: the CocoaPods pod name for the iOS adapter. Omit for
 *     Android-only networks.
 *   - iosExtraPods: optional extra iOS pods that the adapter requires
 *     (e.g. Amazon needs `AmazonPublisherServicesSDK` as a base).
 *   - mavenRepo: optional Android Maven repository definition required to
 *     resolve the adapter or its transitive deps. Each entry is
 *     `{ url, regex }` where `regex` is a Groovy regex string (with `\\`
 *     for backslashes — see the "Note on escaping" in
 *     withAppLovinMediationAdapters.js for details). Omit if the adapter
 *     resolves from `mavenCentral()` or `google()`.
 *
 * Source: AppLovin MAX official "Preparing mediated networks" docs
 * for Android and iOS. List current as of 2026-04.
 *
 * The adapter list intentionally covers the FULL set AppLovin documents,
 * not just the subset that grizzly originally bundled. Bundle size grows
 * roughly linearly with the number of adapters enabled, so users should
 * pick only the networks they actually monetize on.
 */
const NETWORK_REGISTRY = {
	amazon: {
		displayName: "Amazon Publisher Services",
		androidArtifact: "amazon-tam-adapter",
		// APS base SDK — required by the adapter and not pulled transitively
		androidExtraDependencies: ["com.amazon.android:aps-sdk:+"],
		iosPod: "AppLovinMediationAmazonAdMarketplaceAdapter",
		iosExtraPods: ["AmazonPublisherServicesSDK"],
	},
	bidmachine: {
		displayName: "BidMachine",
		androidArtifact: "bidmachine-adapter",
		iosPod: "AppLovinMediationBidMachineAdapter",
		mavenRepo: {
			url: "https://artifactory.bidmachine.io/bidmachine",
			// BidMachine repo also hosts com.explorestack
			regex: "(io\\\\.bidmachine|com\\\\.explorestack).*",
		},
	},
	bigoads: {
		displayName: "BIGO Ads",
		androidArtifact: "bigoads-adapter",
		iosPod: "AppLovinMediationBigoAdsAdapter",
	},
	chartboost: {
		displayName: "Chartboost",
		androidArtifact: "chartboost-adapter",
		iosPod: "AppLovinMediationChartboostAdapter",
		mavenRepo: {
			url: "https://cboost.jfrog.io/artifactory/chartboost-ads/",
			regex: "com\\\\.chartboost.*",
		},
	},
	csj: {
		// CSJ (China-only) — iOS only adapter as documented by AppLovin
		displayName: "CSJ (Pangle China)",
		iosPod: "AppLovinMediationCSJAdapter",
	},
	fyber: {
		displayName: "DT Exchange (Fyber)",
		androidArtifact: "fyber-adapter",
		iosPod: "AppLovinMediationFyberAdapter",
	},
	googleAdManager: {
		displayName: "Google Ad Manager",
		androidArtifact: "google-ad-manager-adapter",
		iosPod: "AppLovinMediationGoogleAdManagerAdapter",
	},
	google: {
		displayName: "Google AdMob / Google Bidding",
		androidArtifact: "google-adapter",
		iosPod: "AppLovinMediationGoogleAdapter",
	},
	hyprmx: {
		displayName: "HyprMX",
		androidArtifact: "hyprmx-adapter",
		iosPod: "AppLovinMediationHyprMXAdapter",
	},
	inmobi: {
		displayName: "InMobi",
		androidArtifact: "inmobi-adapter",
		// InMobi adapter requires Picasso + RecyclerView
		androidExtraDependencies: [
			"com.squareup.picasso:picasso:2.8",
			"androidx.recyclerview:recyclerview:1.1.0",
		],
		iosPod: "AppLovinMediationInMobiAdapter",
	},
	ironsource: {
		displayName: "ironSource",
		androidArtifact: "ironsource-adapter",
		iosPod: "AppLovinMediationIronSourceAdapter",
		mavenRepo: {
			url: "https://android-sdk.is.com/",
			regex: "com\\\\.ironsource.*",
		},
	},
	liftoff: {
		// Liftoff Monetize is the rebranded Vungle. AppLovin still uses the
		// vungle artifact name on Android.
		displayName: "Liftoff Monetize (Vungle)",
		androidArtifact: "vungle-adapter",
		iosPod: "AppLovinMediationVungleAdapter",
		mavenRepo: {
			url: "https://cboost.jfrog.io/artifactory/vungle-android-sdk",
			regex: "com\\\\.vungle.*",
		},
	},
	line: {
		displayName: "LINE",
		androidArtifact: "line-adapter",
		iosPod: "AppLovinMediationLineAdapter",
	},
	maio: {
		displayName: "Maio",
		androidArtifact: "maio-adapter",
		iosPod: "AppLovinMediationMaioAdapter",
		mavenRepo: {
			url: "https://imobile-maio.github.io/maven",
			regex: "jp\\\\.maio.*",
		},
	},
	meta: {
		// Meta Audience Network. AppLovin keeps the legacy "facebook" artifactId.
		displayName: "Meta Audience Network",
		androidArtifact: "facebook-adapter",
		iosPod: "AppLovinMediationFacebookAdapter",
	},
	mintegral: {
		displayName: "Mintegral",
		androidArtifact: "mintegral-adapter",
		iosPod: "AppLovinMediationMintegralAdapter",
		mavenRepo: {
			url: "https://dl-maven-android.mintegral.com/repository/mbridge_android_sdk_oversea",
			regex: "com\\\\.mbridge.*",
		},
	},
	mobilefuse: {
		displayName: "MobileFuse",
		androidArtifact: "mobilefuse-adapter",
		iosPod: "AppLovinMediationMobileFuseAdapter",
	},
	moloco: {
		displayName: "Moloco",
		androidArtifact: "moloco-adapter",
		iosPod: "AppLovinMediationMolocoAdapter",
	},
	mytarget: {
		displayName: "myTarget",
		androidArtifact: "mytarget-adapter",
		iosPod: "AppLovinMediationMyTargetAdapter",
	},
	ogury: {
		displayName: "Ogury",
		androidArtifact: "ogury-presage-adapter",
		iosPod: "AppLovinMediationOguryPresageAdapter",
		mavenRepo: {
			url: "https://maven.ogury.co",
			regex: "co\\\\.ogury.*",
		},
	},
	pangle: {
		// Pangle (ByteDance). AppLovin uses the "bytedance" artifactId.
		displayName: "Pangle (ByteDance)",
		androidArtifact: "bytedance-adapter",
		iosPod: "AppLovinMediationByteDanceAdapter",
		mavenRepo: {
			url: "https://artifact.bytedance.com/repository/pangle",
			regex: "com\\\\.pangle.*",
		},
	},
	pubmatic: {
		displayName: "PubMatic",
		androidArtifact: "pubmatic-adapter",
		iosPod: "AppLovinMediationPubMaticAdapter",
		mavenRepo: {
			url: "https://repo.pubmatic.com/artifactory/public-repos",
			regex: "com\\\\.pubmatic.*",
		},
	},
	smaato: {
		displayName: "Smaato",
		androidArtifact: "smaato-adapter",
		iosPod: "AppLovinMediationSmaatoAdapter",
		mavenRepo: {
			url: "https://s3.amazonaws.com/smaato-sdk-releases/",
			regex: "com\\\\.smaato.*",
		},
	},
	tencent: {
		// Tencent GDT — iOS only adapter as documented by AppLovin
		displayName: "Tencent GDT",
		iosPod: "AppLovinMediationTencentGDTAdapter",
	},
	unity: {
		displayName: "Unity Ads",
		androidArtifact: "unityads-adapter",
		iosPod: "AppLovinMediationUnityAdsAdapter",
		mavenRepo: {
			url: "https://unity3ddist.jfrog.io/artifactory/unity-mediation-mvn-prod-local/",
			regex: "com\\\\.unity3d.*",
		},
	},
	verve: {
		displayName: "Verve",
		androidArtifact: "verve-adapter",
		iosPod: "AppLovinMediationVerveAdapter",
		mavenRepo: {
			url: "https://verve.jfrog.io/artifactory/verve-gradle-release",
			regex: "com\\\\.verve.*",
		},
	},
	vk: {
		// VK Ad Network — Android only as documented (no separate iOS pod listed)
		displayName: "VK Ad Network",
		androidArtifact: "vk-ad-network-adapter",
	},
	yandex: {
		displayName: "Yandex",
		androidArtifact: "yandex-adapter",
		iosPod: "AppLovinMediationYandexAdapter",
	},
	yso: {
		displayName: "YSO Network",
		androidArtifact: "yso-network-adapter",
		iosPod: "AppLovinMediationYSONetworkAdapter",
		mavenRepo: {
			url: "https://ysonetwork.s3.eu-west-3.amazonaws.com/sdk/android",
			regex: "com\\\\.yso.*",
		},
	},
};

/**
 * The full list of supported network IDs, exported for users who want
 * "everything" (typically not recommended due to bundle size — see README).
 */
const ALL_NETWORK_IDS = Object.keys(NETWORK_REGISTRY);

module.exports = NETWORK_REGISTRY;
module.exports.NETWORK_REGISTRY = NETWORK_REGISTRY;
module.exports.ALL_NETWORK_IDS = ALL_NETWORK_IDS;
