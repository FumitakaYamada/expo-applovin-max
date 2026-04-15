/**
 * Expo Config Plugin: AppLovin MAX Mediation Adapters (Android + iOS)
 *
 * This plugin is **opt-in**. Pass a `networks` array (or the more
 * advanced `androidAdapters` / `iosPods` overrides) to specify which
 * mediated ad networks you want to integrate. By default — i.e. when
 * neither `networks` nor the per-platform arrays are set — the plugin
 * is a no-op and adds NOTHING. This avoids the bundle size hit of
 * shipping every single AppLovin MAX adapter when most apps only
 * monetize on a handful of networks.
 *
 * Pick networks by short ID. A reasonable de facto default for global
 * apps (the six networks that together dominate MAX waterfall revenue
 * for most categories) is:
 *
 *     networks: ["pangle", "mintegral", "liftoff", "meta", "google", "unity"]
 *
 * Trim or extend to match your own eCPM data from the AppLovin dashboard.
 *
 * The plugin looks each ID up in the bundled `NETWORK_REGISTRY` (see
 * `./networkRegistry.js`) and adds:
 *
 *   Android:
 *     1. `implementation("com.applovin.mediation:<artifact>:<version>")`
 *        for the corresponding adapter, plus any `androidExtraDependencies`
 *        the network needs (e.g. Amazon TAM needs the APS base SDK)
 *     2. The network's Maven repository to BOTH `settings.gradle`
 *        (`dependencyResolutionManagement`) and project `build.gradle`
 *        (`allprojects`), each scoped via `includeGroupByRegex` so it
 *        only resolves the network's own packages
 *     3. `packagingOptions { pickFirst ... }` to resolve duplicate
 *        native `.so` files shipped by multiple adapters (Pangle,
 *        Mintegral, ironSource etc. ship the same native libs)
 *     4. `<meta-data android:name="com.google.android.gms.ads.APPLICATION_ID">`
 *        in `AndroidManifest.xml` if you provide `admobAppIdAndroid`
 *
 *   iOS:
 *     1. `pod 'AppLovinMediation<Network>Adapter'` for the iOS pod,
 *        plus any `iosExtraPods` the network needs (e.g. Amazon needs
 *        `AmazonPublisherServicesSDK` as a base)
 *     2. `GADApplicationIdentifier` in `Info.plist` if you provide
 *        `admobAppIdIOS`
 *     3. A Podfile `post_install` hook that fixes xcframework linking
 *        with `useFrameworks: "static"` (sets `LD_RUNPATH_SEARCH_PATHS`,
 *        `-ObjC` ldflag, stubs out Info.plist version keys on the APS
 *        framework, etc.)
 *
 * Options (see README for the full reference):
 *
 *   - networks?: string[]
 *       Short network IDs from `NETWORK_REGISTRY` keys. Recommended way
 *       to pick adapters. Both Android and iOS get derived automatically.
 *
 *   - androidAdapters?: Array<{ name: string, version?: string, extraDependencies?: string[] }>
 *       Advanced override. Use this if you want a specific version, a
 *       custom artifact name, or extra deps not in the registry. If set,
 *       it REPLACES whatever `networks` would generate for Android.
 *
 *   - iosPods?: Array<{ name: string, version?: string }>
 *       Advanced override. Same idea but for iOS.
 *
 *   - mavenRepositories?: Array<{ url: string, regex: string }>
 *       Advanced override for Maven repos. If set, REPLACES whatever
 *       `networks` would generate. Useful when you're adding a custom
 *       adapter or your build needs a private mirror.
 *
 *   - admobAppIdAndroid?: string
 *   - admobAppIdIOS?: string
 *       AdMob App IDs. Required if the Google adapter (`networks: ["google"]`
 *       or similar) is enabled — otherwise the app crashes at launch with
 *       "Missing application ID".
 *
 *   - disableIOSFrameworkLinkingFix?: boolean (default false)
 *       If true, do NOT add the post_install hook that fixes xcframework
 *       linking. Leave as default unless you have your own linking fix.
 */

const {
	withAppBuildGradle,
	withProjectBuildGradle,
	withSettingsGradle,
	withAndroidManifest,
	withInfoPlist,
	withPodfile,
	withPlugins,
} = require("@expo/config-plugins");

const NETWORK_REGISTRY = require("./networkRegistry");

const MARKER = "AppLovin MAX Mediation";
const GOOGLE_ADAPTER_NAMES = [
	"google-adapter",
	"google-ad-manager-adapter",
	"AppLovinMediationGoogleAdapter",
	"AppLovinMediationGoogleAdManagerAdapter",
];

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

/**
 * Convert a short `networks` array into the full Android + iOS + Maven
 * descriptor arrays the rest of the plugin operates on.
 */
function expandNetworks(networks) {
	const androidAdapters = [];
	const iosPods = [];
	const mavenRepositories = [];
	const seenAdapters = new Set();
	const seenPods = new Set();
	const seenRepos = new Set();
	const unknownNetworks = [];

	for (const id of networks) {
		const entry = NETWORK_REGISTRY[id];
		if (!entry) {
			unknownNetworks.push(id);
			continue;
		}

		// Android adapter (+ extras)
		if (entry.androidArtifact && !seenAdapters.has(entry.androidArtifact)) {
			seenAdapters.add(entry.androidArtifact);
			androidAdapters.push({
				name: entry.androidArtifact,
				version: "+",
				extraDependencies: entry.androidExtraDependencies,
			});
		}

		// iOS pod (+ extras)
		if (entry.iosPod && !seenPods.has(entry.iosPod)) {
			seenPods.add(entry.iosPod);
			iosPods.push({ name: entry.iosPod });
		}
		if (entry.iosExtraPods) {
			for (const extra of entry.iosExtraPods) {
				if (!seenPods.has(extra)) {
					seenPods.add(extra);
					// Insert base SDKs at the FRONT of the pod list so they're
					// declared before any adapter that depends on them. The
					// AppLovin docs explicitly list APS before its adapter pod.
					iosPods.unshift({ name: extra });
				}
			}
		}

		// Maven repo
		if (entry.mavenRepo && !seenRepos.has(entry.mavenRepo.url)) {
			seenRepos.add(entry.mavenRepo.url);
			mavenRepositories.push(entry.mavenRepo);
		}
	}

	if (unknownNetworks.length > 0) {
		console.warn(
			`[AppLovinMediationAdapters] Unknown network IDs: ${unknownNetworks.join(", ")}. ` +
				`Valid IDs: ${Object.keys(NETWORK_REGISTRY).join(", ")}.`,
		);
	}

	return { androidAdapters, iosPods, mavenRepositories };
}

function getImplementationString(adapter) {
	return `    implementation("com.applovin.mediation:${adapter.name}:${adapter.version ?? "+"}")`;
}

function generateSettingsMavenBlock(repo) {
	return `            maven {
                url = uri("${repo.url}")
                content { includeGroupByRegex("${repo.regex}") }
            }`;
}

function generateProjectMavenBlock(repo) {
	return `        maven {
            url "${repo.url}"
            content { includeGroupByRegex "${repo.regex}" }
        }`;
}

function hasGoogleAdapter(androidAdapters, iosPods) {
	return (
		androidAdapters.some((a) => GOOGLE_ADAPTER_NAMES.includes(a.name)) ||
		iosPods.some((p) => GOOGLE_ADAPTER_NAMES.includes(p.name))
	);
}

// ──────────────────────────────────────────────────────────────────────────
// Android sub-plugins
// ──────────────────────────────────────────────────────────────────────────

function withAdMobAppIdAndroid(config, { admobAppId }) {
	if (!admobAppId) return config;
	return withAndroidManifest(config, (config) => {
		const manifest = config.modResults;
		const application = manifest.manifest.application?.[0];
		if (!application) {
			console.warn(
				"[AppLovinMediationAdapters] No application element found in AndroidManifest",
			);
			return config;
		}

		if (!application["meta-data"]) application["meta-data"] = [];

		const hasAdMobId = application["meta-data"].some(
			(meta) =>
				meta.$?.["android:name"] ===
				"com.google.android.gms.ads.APPLICATION_ID",
		);

		if (!hasAdMobId) {
			application["meta-data"].push({
				$: {
					"android:name": "com.google.android.gms.ads.APPLICATION_ID",
					"android:value": admobAppId,
				},
			});
			console.log(
				"[AppLovinMediationAdapters] ✓ Added AdMob App ID to AndroidManifest.xml",
			);
		}

		return config;
	});
}

function withAppLovinAdapterDependencies(config, { androidAdapters }) {
	if (!androidAdapters || androidAdapters.length === 0) return config;
	return withAppBuildGradle(config, (config) => {
		let buildGradle = config.modResults.contents;
		if (buildGradle.includes("com.applovin.mediation")) return config;

		const match = buildGradle.match(/dependencies\s*\{/);
		if (match) {
			// Build the lines for adapter implementations + their extras
			const lines = [`    // ${MARKER} Adapters`];
			for (const adapter of androidAdapters) {
				lines.push(getImplementationString(adapter));
				if (adapter.extraDependencies) {
					for (const dep of adapter.extraDependencies) {
						lines.push(`    implementation("${dep}")`);
					}
				}
			}
			const block = `\n${lines.join("\n")}\n`;
			const idx = match.index + match[0].length;
			buildGradle = buildGradle.slice(0, idx) + block + buildGradle.slice(idx);
			console.log(
				`[AppLovinMediationAdapters] ✓ Added ${androidAdapters.length} adapter dependencies to app/build.gradle`,
			);
		}

		// packagingOptions pickFirst to resolve duplicate .so files from
		// adapters that ship the same native libs (Pangle, Mintegral, ironSource).
		if (!buildGradle.includes("pickFirst")) {
			const androidMatch = buildGradle.match(/android\s*\{/);
			if (androidMatch) {
				const packagingBlock = `\n    packagingOptions {\n        // ${MARKER}: resolve duplicate .so files from mediation adapters\n        pickFirst "lib/*/libc++_shared.so"\n        pickFirst "lib/*/libfbjni.so"\n        pickFirst "lib/*/libfolly_runtime.so"\n        pickFirst "lib/*/libglog.so"\n    }\n`;
				const androidIdx = androidMatch.index + androidMatch[0].length;
				buildGradle =
					buildGradle.slice(0, androidIdx) +
					packagingBlock +
					buildGradle.slice(androidIdx);
				console.log(
					"[AppLovinMediationAdapters] ✓ Added packagingOptions pickFirst to resolve duplicate .so conflicts",
				);
			}
		}

		config.modResults.contents = buildGradle;
		return config;
	});
}

function withAppLovinSettingsRepos(config, { mavenRepositories }) {
	if (!mavenRepositories || mavenRepositories.length === 0) return config;
	return withSettingsGradle(config, (config) => {
		const gradle = config.modResults.contents;
		if (gradle.includes(MARKER)) return config;

		const blocks = mavenRepositories.map(generateSettingsMavenBlock).join("\n");
		const content = `\n            // ${MARKER} Repositories\n${blocks}`;

		const match = gradle.match(
			/dependencyResolutionManagement\s*\{[\s\S]*?repositories\s*\{/,
		);
		if (match) {
			const idx = match.index + match[0].length;
			config.modResults.contents =
				gradle.slice(0, idx) + content + gradle.slice(idx);
			console.log(
				"[AppLovinMediationAdapters] ✓ Added repos to settings.gradle dependencyResolutionManagement",
			);
		}
		return config;
	});
}

function withAppLovinProjectRepos(config, { mavenRepositories }) {
	if (!mavenRepositories || mavenRepositories.length === 0) return config;
	return withProjectBuildGradle(config, (config) => {
		const gradle = config.modResults.contents;
		if (gradle.includes(MARKER)) return config;

		const blocks = mavenRepositories.map(generateProjectMavenBlock).join("\n");
		const content = `\n        // ${MARKER} Repositories\n${blocks}`;

		const allprojectsMatch = gradle.match(/allprojects\s*\{/);
		if (allprojectsMatch) {
			const afterMatch = gradle.slice(allprojectsMatch.index);
			const reposMatch = afterMatch.match(/repositories\s*\{/);
			if (reposMatch) {
				const idx =
					allprojectsMatch.index + reposMatch.index + reposMatch[0].length;
				config.modResults.contents =
					gradle.slice(0, idx) + content + gradle.slice(idx);
				console.log(
					"[AppLovinMediationAdapters] ✓ Added repos to build.gradle allprojects",
				);
				return config;
			}
		}

		// Fallback: create an allprojects block
		const pluginsMatch = gradle.match(/plugins\s*\{[\s\S]*?\n\}/);
		const insertAt = pluginsMatch
			? pluginsMatch.index + pluginsMatch[0].length
			: 0;
		const newBlock = `\n\nallprojects {\n    repositories {\n${content}\n        google()\n        mavenCentral()\n    }\n}\n`;
		config.modResults.contents =
			gradle.slice(0, insertAt) + newBlock + gradle.slice(insertAt);
		console.log(
			"[AppLovinMediationAdapters] ✓ Created allprojects block in build.gradle",
		);
		return config;
	});
}

// ──────────────────────────────────────────────────────────────────────────
// iOS sub-plugins
// ──────────────────────────────────────────────────────────────────────────

function withAdMobAppIdIOS(config, { admobAppId }) {
	if (!admobAppId) return config;
	return withInfoPlist(config, (config) => {
		if (!config.modResults.GADApplicationIdentifier) {
			config.modResults.GADApplicationIdentifier = admobAppId;
			console.log(
				"[AppLovinMediationAdapters] ✓ Added GADApplicationIdentifier to Info.plist",
			);
		}
		return config;
	});
}

function withAppLovinAdapterPods(config, { iosPods }) {
	if (!iosPods || iosPods.length === 0) return config;
	return withPodfile(config, (config) => {
		const podfile = config.modResults.contents;
		if (podfile.includes("# AppLovin MAX Mediation Adapter Pods")) {
			console.log(
				"[AppLovinMediationAdapters] iOS pods already present, skipping",
			);
			return config;
		}

		const podLines = iosPods
			.map((p) =>
				p.version ? `  pod '${p.name}', '${p.version}'` : `  pod '${p.name}'`,
			)
			.join("\n");
		const block = `\n  # AppLovin MAX Mediation Adapter Pods\n${podLines}\n`;

		const targetMatch = podfile.match(/target\s+['"][^'"]+['"]\s+do/);
		if (!targetMatch) {
			console.warn(
				"[AppLovinMediationAdapters] No target block found in Podfile, skipping iOS pods",
			);
			return config;
		}

		const insertIdx = targetMatch.index + targetMatch[0].length;
		config.modResults.contents =
			podfile.slice(0, insertIdx) + block + podfile.slice(insertIdx);
		console.log(
			`[AppLovinMediationAdapters] ✓ Added ${iosPods.length} pods to Podfile target block`,
		);
		return config;
	});
}

function getPostInstallFix(shortVersion, buildVersion) {
	return `
    # Fix for AppLovin mediation adapter xcframeworks with static frameworks
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['LD_RUNPATH_SEARCH_PATHS'] ||= ['$(inherited)', '@executable_path/Frameworks']
        config.build_settings['FRAMEWORK_SEARCH_PATHS'] ||= ['$(inherited)']

        xcconfig_path = config.base_configuration_reference&.real_path
        if xcconfig_path && File.exist?(xcconfig_path)
          xcconfig_content = File.read(xcconfig_path)
          new_content = xcconfig_content
          if !new_content.include?('-ObjC')
            if new_content =~ /OTHER_LDFLAGS/
              new_content = new_content.gsub(/OTHER_LDFLAGS = (.*)$/, 'OTHER_LDFLAGS = \\\\1 -ObjC')
            end
          end
          File.write(xcconfig_path, new_content) if new_content != xcconfig_content
        end
      end

      # Don't require code signing on bundle targets (some adapters ship bundles)
      if target.respond_to?(:product_type) && target.product_type == "com.apple.product-type.bundle"
        target.build_configurations.each do |config|
          config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
        end
      end
    end

    # Ensure APS framework Info.plist has required version keys
    aps_framework_paths = Dir.glob(File.join(installer.sandbox.root.to_s, "**", "APSiOSSharedLib.framework"))
    aps_framework_paths.each do |framework_path|
      info_plist_path = File.join(framework_path, "Info.plist")
      next unless File.exist?(info_plist_path)
      short_version = "${shortVersion}"
      build_version = "${buildVersion}"
      set_short_version =
        system("/usr/libexec/PlistBuddy -c \\"Set :CFBundleShortVersionString #{short_version}\\" \\"#{info_plist_path}\\"") ||
        system("/usr/libexec/PlistBuddy -c \\"Add :CFBundleShortVersionString string #{short_version}\\" \\"#{info_plist_path}\\"")
      set_build_version =
        system("/usr/libexec/PlistBuddy -c \\"Set :CFBundleVersion #{build_version}\\" \\"#{info_plist_path}\\"") ||
        system("/usr/libexec/PlistBuddy -c \\"Add :CFBundleVersion string #{build_version}\\" \\"#{info_plist_path}\\"")
      if set_short_version || set_build_version
        puts "[AppLovinMediationAdapters] Updated APS Info.plist at #{info_plist_path}"
      end
    end
`;
}

function withIOSFrameworkLinkingFix(config) {
	return withPodfile(config, (config) => {
		const podfile = config.modResults.contents;
		const shortVersion = config.version ?? "1.0.0";
		const buildVersion = config.ios?.buildNumber ?? "1";
		const postInstallFix = getPostInstallFix(shortVersion, buildVersion);

		if (podfile.includes("Fix for AppLovin mediation adapter xcframeworks")) {
			console.log(
				"[AppLovinMediationAdapters] iOS post_install fix already present, skipping",
			);
			return config;
		}

		let modifiedPodfile = podfile;
		const postInstallRegex = /post_install do \|installer\|/;
		if (postInstallRegex.test(podfile)) {
			modifiedPodfile = podfile.replace(
				postInstallRegex,
				`post_install do |installer|${postInstallFix}\n    # Original post_install content below`,
			);
		} else {
			const lastEndIndex = podfile.lastIndexOf("end");
			if (lastEndIndex !== -1) {
				modifiedPodfile = `${podfile.slice(0, lastEndIndex)}\n  post_install do |installer|${postInstallFix}\n  end\n\n${podfile.slice(lastEndIndex)}`;
			}
		}

		config.modResults.contents = modifiedPodfile;
		console.log(
			"[AppLovinMediationAdapters] ✓ Added xcframework linking fix to Podfile post_install",
		);
		return config;
	});
}

// ──────────────────────────────────────────────────────────────────────────
// Main plugin
// ──────────────────────────────────────────────────────────────────────────

function withAppLovinMediationAdapters(config, options = {}) {
	// Resolve the adapter / pod / repo lists. Priority order:
	//   1. `networks` (high-level; recommended)
	//   2. `androidAdapters` / `iosPods` / `mavenRepositories` (advanced overrides)
	//   3. nothing (no-op)
	let androidAdapters;
	let iosPods;
	let mavenRepositories;

	if (Array.isArray(options.networks)) {
		const expanded = expandNetworks(options.networks);
		androidAdapters = expanded.androidAdapters;
		iosPods = expanded.iosPods;
		mavenRepositories = expanded.mavenRepositories;
	}

	// Per-platform overrides take precedence if explicitly set
	if (options.androidAdapters !== undefined) {
		androidAdapters = options.androidAdapters;
	}
	if (options.iosPods !== undefined) {
		iosPods = options.iosPods;
	}
	if (options.mavenRepositories !== undefined) {
		mavenRepositories = options.mavenRepositories;
	}

	// Default to empty arrays so the sub-plugins are no-ops
	androidAdapters = androidAdapters ?? [];
	iosPods = iosPods ?? [];
	mavenRepositories = mavenRepositories ?? [];

	// Warn if Google adapter is enabled but AdMob App IDs are missing
	if (hasGoogleAdapter(androidAdapters, iosPods)) {
		if (!options.admobAppIdAndroid) {
			console.warn(
				"[AppLovinMediationAdapters] ⚠ Google adapter is enabled but admobAppIdAndroid is not set. " +
					'The app will crash on launch with "Missing application ID" unless you set it.',
			);
		}
		if (!options.admobAppIdIOS) {
			console.warn(
				"[AppLovinMediationAdapters] ⚠ Google adapter is enabled but admobAppIdIOS is not set. " +
					'The app will crash on launch with "Missing application ID" unless you set it.',
			);
		}
	}

	const plugins = [
		[withAdMobAppIdAndroid, { admobAppId: options.admobAppIdAndroid }],
		[withAdMobAppIdIOS, { admobAppId: options.admobAppIdIOS }],
		[withAppLovinAdapterDependencies, { androidAdapters }],
		[withAppLovinSettingsRepos, { mavenRepositories }],
		[withAppLovinProjectRepos, { mavenRepositories }],
		[withAppLovinAdapterPods, { iosPods }],
	];

	if (!(options.disableIOSFrameworkLinkingFix ?? false) && iosPods.length > 0) {
		plugins.push(withIOSFrameworkLinkingFix);
	}

	return withPlugins(config, plugins);
}

module.exports = withAppLovinMediationAdapters;
module.exports.NETWORK_REGISTRY = NETWORK_REGISTRY;
module.exports.ALL_NETWORK_IDS = NETWORK_REGISTRY.ALL_NETWORK_IDS;
