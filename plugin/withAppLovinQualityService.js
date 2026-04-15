/**
 * Expo Config Plugin: AppLovin Quality Service (Ad Review)
 *
 * Integrates AppLovin's Ad Review feature on both Android and iOS.
 *
 *   Android:
 *     1. Adds the AppLovin Maven repo (`https://artifacts.applovin.com/android`)
 *        to `buildscript { repositories }` in project build.gradle
 *     2. Adds `classpath 'com.applovin.quality:AppLovinQualityServiceGradlePlugin:+'`
 *        to `buildscript { dependencies }` in project build.gradle
 *     3. Adds `apply plugin: 'applovin-quality-service'` and `applovin { apiKey ... }`
 *        to app/build.gradle
 *
 *   iOS:
 *     1. Copies the bundled Ruby setup script into `ios/` during prebuild
 *     2. Runs `ruby AppLovinQualityServiceSetup-ios.rb install` to download
 *        the xcframework and modify app.xcodeproj (Link Binary, Embed,
 *        Run Script build phase for auto-update)
 *     3. Programmatically verifies the xcframework is in Link Binary With
 *        Libraries + Embed Frameworks build phases, adding it if missing
 *        (empirically the installer sometimes embeds without linking, which
 *        breaks Ad Review at runtime — the MAX Mediation Debugger shows
 *        Ad Review Version as ❌)
 *
 * Why run the installer in prebuild instead of eas-build-post-install?
 *   EAS phase order is PREBUILD → INSTALL_PODS → POST_INSTALL_HOOK →
 *   RUN_FASTLANE. Running in prebuild means xcodeproj changes are in place
 *   before pod install (and before fastlane reads the project), which
 *   eliminates race conditions and avoids needing any eas-build-post-install
 *   configuration in the consuming project's package.json.
 *
 * The iOS installer is macOS-only (it extracts and executes an embedded
 * Mach-O binary). On non-macOS hosts the plugin copies the script but skips
 * the installer step with a warning — `expo prebuild --platform ios` is
 * unsupported on non-macOS anyway, so this only matters for local dev flows
 * that run prebuild for both platforms.
 *
 * @see https://developers.applovin.com/en/android/ad-experiences/ad-review/
 * @see https://developers.applovin.com/en/ios/ad-experiences/ad-review/
 */

const {
	withAppBuildGradle,
	withProjectBuildGradle,
	withDangerousMod,
	withPlugins,
} = require("@expo/config-plugins");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const APPLOVIN_MAVEN_URL = "https://artifacts.applovin.com/android";
const APPLOVIN_GRADLE_CLASSPATH =
	"com.applovin.quality:AppLovinQualityServiceGradlePlugin:+";
const APPLOVIN_GRADLE_PLUGIN_ID = "applovin-quality-service";
const MARKER_PROJECT = "AppLovin Quality Service buildscript";
const MARKER_APP = "applovin-quality-service Apply";

// ──────────────────────────────────────────────────────────────────────────
// Android
// ──────────────────────────────────────────────────────────────────────────

function withAppLovinQualityServiceProjectGradle(config) {
	return withProjectBuildGradle(config, (config) => {
		let contents = config.modResults.contents;

		if (contents.includes(MARKER_PROJECT)) {
			console.log(
				"[AppLovinQualityService] Project build.gradle already patched",
			);
			return config;
		}

		// Inject the Maven repo into buildscript { repositories { ... } } only.
		// We target buildscript specifically (not allprojects) to avoid hitting
		// the wrong repositories block.
		const buildscriptIdx = contents.indexOf("buildscript");
		if (buildscriptIdx === -1) {
			console.warn(
				"[AppLovinQualityService] buildscript block not found in project build.gradle",
			);
			return config;
		}

		const reposPattern = /repositories\s*\{/g;
		reposPattern.lastIndex = buildscriptIdx;
		const reposMatch = reposPattern.exec(contents);
		if (!reposMatch) {
			console.warn(
				"[AppLovinQualityService] repositories block not found in buildscript",
			);
			return config;
		}
		const reposEnd = reposMatch.index + reposMatch[0].length;
		const reposInsert = `\n        // ${MARKER_PROJECT} Repositories\n        maven { url '${APPLOVIN_MAVEN_URL}' }`;
		contents =
			contents.slice(0, reposEnd) + reposInsert + contents.slice(reposEnd);

		// Inject the classpath into buildscript { dependencies { ... } }. The
		// first `dependencies {` inside buildscript is the right target.
		const depsPattern = /dependencies\s*\{/g;
		depsPattern.lastIndex = buildscriptIdx;
		const depsMatch = depsPattern.exec(contents);
		if (!depsMatch) {
			console.warn(
				"[AppLovinQualityService] dependencies block not found in buildscript",
			);
			return config;
		}
		const depsEnd = depsMatch.index + depsMatch[0].length;
		const depsInsert = `\n        // ${MARKER_PROJECT} Classpath\n        classpath '${APPLOVIN_GRADLE_CLASSPATH}'`;
		contents =
			contents.slice(0, depsEnd) + depsInsert + contents.slice(depsEnd);

		config.modResults.contents = contents;
		console.log(
			"[AppLovinQualityService] ✓ Added AppLovin repo + classpath to project build.gradle",
		);
		return config;
	});
}

function withAppLovinQualityServiceAppGradle(config, { apiKey }) {
	return withAppBuildGradle(config, (config) => {
		let contents = config.modResults.contents;

		if (contents.includes(MARKER_APP)) {
			console.log("[AppLovinQualityService] App build.gradle already patched");
			return config;
		}

		const block = `
// ${MARKER_APP}
apply plugin: '${APPLOVIN_GRADLE_PLUGIN_ID}'
applovin {
    apiKey "${apiKey}"
}
`;
		contents = `${contents.trimEnd()}\n${block}`;
		config.modResults.contents = contents;
		console.log(
			"[AppLovinQualityService] ✓ Applied applovin-quality-service plugin in app/build.gradle",
		);
		return config;
	});
}

// ──────────────────────────────────────────────────────────────────────────
// iOS
// ──────────────────────────────────────────────────────────────────────────

/**
 * Open app.xcodeproj and ensure AppLovinQualityService.xcframework is present
 * in the main app target's Link Binary With Libraries and Embed Frameworks
 * build phases. Adds it if missing (with "Embed & Sign" semantics).
 *
 * This hardening exists because empirically the AppLovin installer alone has
 * been observed to embed the framework without linking it, which leaves the
 * MAX Mediation Debugger showing Ad Review Version as ❌ even though the
 * framework is in the .app bundle.
 */
function ensureXcframeworkLinked(platformProjectRoot) {
	// Lazy-require so non-iOS code paths don't pay the cost
	let xcode;
	try {
		xcode = require("xcode");
	} catch (e) {
		console.warn(
			"[AppLovinQualityService] Could not require 'xcode' package: " +
				e.message +
				". Skipping link verification.",
		);
		return;
	}

	const xcframeworkSourcePath = path.join(
		platformProjectRoot,
		"AppLovinQualityService",
		"AppLovinQualityService.xcframework",
	);
	if (!fs.existsSync(xcframeworkSourcePath)) {
		console.warn(
			`[AppLovinQualityService] xcframework not found at ${xcframeworkSourcePath}, skipping link verification`,
		);
		return;
	}

	const xcodeprojName = fs
		.readdirSync(platformProjectRoot)
		.find((name) => name.endsWith(".xcodeproj"));
	if (!xcodeprojName) {
		console.warn(
			"[AppLovinQualityService] No .xcodeproj found in ios/ directory",
		);
		return;
	}
	const pbxprojPath = path.join(
		platformProjectRoot,
		xcodeprojName,
		"project.pbxproj",
	);
	if (!fs.existsSync(pbxprojPath)) {
		console.warn(
			`[AppLovinQualityService] project.pbxproj not found at ${pbxprojPath}`,
		);
		return;
	}

	const project = xcode.project(pbxprojPath);
	project.parseSync();

	// Find the main application target (skip ShareExtension etc.)
	const targets = project.pbxNativeTargetSection();
	let mainTargetKey = null;
	let mainTargetName = null;
	for (const key of Object.keys(targets)) {
		if (key.endsWith("_comment")) continue;
		const target = targets[key];
		if (target.productType === '"com.apple.product-type.application"') {
			mainTargetKey = key;
			mainTargetName = target.name.replace(/^"|"$/g, "");
			break;
		}
	}
	if (!mainTargetKey) {
		console.warn(
			"[AppLovinQualityService] No application target found in xcodeproj",
		);
		return;
	}

	const frameworkName = "AppLovinQualityService.xcframework";

	// Check Link Binary With Libraries
	const frameworksBuildPhase =
		project.pbxFrameworksBuildPhaseObj(mainTargetKey);
	const alreadyLinked =
		frameworksBuildPhase?.files?.some((f) =>
			(f.comment || "").includes(frameworkName),
		) ?? false;

	// Check Embed Frameworks
	const copyFilesBuildPhase =
		project.hash.project.objects.PBXCopyFilesBuildPhase || {};
	let alreadyEmbedded = false;
	for (const key of Object.keys(copyFilesBuildPhase)) {
		if (key.endsWith("_comment")) continue;
		const phase = copyFilesBuildPhase[key];
		if (!phase?.files) continue;
		if (phase.files.some((f) => (f.comment || "").includes(frameworkName))) {
			alreadyEmbedded = true;
			break;
		}
	}

	console.log(
		`[AppLovinQualityService] Main target: ${mainTargetName}, linked=${alreadyLinked}, embedded=${alreadyEmbedded}`,
	);

	if (alreadyLinked && alreadyEmbedded) {
		console.log(
			"[AppLovinQualityService] ✓ xcframework is already linked and embedded",
		);
		return;
	}

	// Add the framework with Embed & Sign semantics
	const relFrameworkPath = path.join(
		"AppLovinQualityService",
		"AppLovinQualityService.xcframework",
	);
	try {
		project.addFramework(relFrameworkPath, {
			embed: true,
			link: true,
			sign: true,
			customFramework: true,
			target: mainTargetKey,
		});
		console.log(
			`[AppLovinQualityService] ✓ Added ${frameworkName} to Link Binary With Libraries + Embed Frameworks`,
		);
	} catch (e) {
		console.warn(
			`[AppLovinQualityService] Failed to add framework via xcode package: ${e.message}`,
		);
		return;
	}

	fs.writeFileSync(pbxprojPath, project.writeSync());
	console.log("[AppLovinQualityService] ✓ Saved updated project.pbxproj");
}

function withAppLovinQualityServiceIOS(config, { iosSetupScriptPath }) {
	return withDangerousMod(config, [
		"ios",
		(config) => {
			const projectRoot = config.modRequest.projectRoot;
			const platformProjectRoot = config.modRequest.platformProjectRoot;

			// The iOS setup script (AppLovinQualityServiceSetup-ios.rb) must be
			// downloaded by the project owner from their AppLovin dashboard:
			//   AppLovin dashboard → MAX → Ad Review → Download Setup Script (iOS)
			// Each publisher's copy contains an account-specific API key embedded
			// by AppLovin's download server, so this library cannot bundle the
			// script without leaking another publisher's credentials. Users MUST
			// pass `iosSetupScriptPath` pointing to their own downloaded copy.
			if (!iosSetupScriptPath) {
				console.warn(
					"[AppLovinQualityService] iosSetupScriptPath is not set — iOS Ad Review will be skipped. " +
						"Download AppLovinQualityServiceSetup-ios.rb from the AppLovin dashboard " +
						"(MAX → Ad Review → Download Setup Script iOS), commit it to your repo, " +
						"and pass its path via adReview.iosSetupScriptPath.",
				);
				return config;
			}

			const sourcePath = path.join(projectRoot, iosSetupScriptPath);

			if (!fs.existsSync(sourcePath)) {
				console.warn(
					`[AppLovinQualityService] Source script not found at ${sourcePath}, skipping iOS setup`,
				);
				return config;
			}

			const destPath = path.join(
				platformProjectRoot,
				"AppLovinQualityServiceSetup-ios.rb",
			);

			// Step 1: copy the script into ios/
			if (!fs.existsSync(platformProjectRoot)) {
				fs.mkdirSync(platformProjectRoot, { recursive: true });
			}
			fs.copyFileSync(sourcePath, destPath);
			console.log(
				`[AppLovinQualityService] ✓ Copied iOS setup script to ${path.relative(projectRoot, destPath)}`,
			);

			// Step 2: run the installer on macOS. It modifies app.xcodeproj to
			// add AppLovinQualityService.xcframework and the build phases that
			// enable Ad Review at runtime.
			if (os.platform() !== "darwin") {
				console.warn(
					"[AppLovinQualityService] Skipping installer: host is not macOS. " +
						"Ad Review will not be active unless this build runs on macOS (e.g. EAS).",
				);
				return config;
			}

			console.log(
				"[AppLovinQualityService] Running installer: ruby AppLovinQualityServiceSetup-ios.rb install",
			);
			try {
				execFileSync(
					"ruby",
					["AppLovinQualityServiceSetup-ios.rb", "install"],
					{
						cwd: platformProjectRoot,
						stdio: "inherit",
						env: process.env,
					},
				);
				console.log(
					"[AppLovinQualityService] ✓ Installer completed (app.xcodeproj modified)",
				);
			} catch (e) {
				console.warn(
					`[AppLovinQualityService] Installer failed: ${e.message}. ` +
						"iOS Ad Review may not be active in this build.",
				);
				return config;
			}

			// Step 3: verify the xcframework is properly linked and embedded.
			try {
				ensureXcframeworkLinked(platformProjectRoot);
			} catch (e) {
				console.warn(
					`[AppLovinQualityService] Link verification failed: ${e.message}. ` +
						"If Ad Review shows ❌ in MAX Mediation Debugger this is likely why.",
				);
			}

			return config;
		},
	]);
}

// ──────────────────────────────────────────────────────────────────────────
// Main plugin
// ──────────────────────────────────────────────────────────────────────────

/**
 * Android and iOS Ad Review each require a DIFFERENT credential issued by
 * AppLovin. Pass whichever platforms you want Ad Review for, or both.
 *
 * @param {object} config Expo config
 * @param {object} options
 * @param {string} [options.androidReportKey]
 *   AppLovin "Report Key" — get it from AppLovin dashboard → Account →
 *   Keys → Report Key. Written into `app/build.gradle`'s
 *   `applovin { apiKey "..." }` block by this plugin. If omitted, Android
 *   Ad Review is skipped entirely (no Gradle plugin applied, no repo
 *   injected).
 * @param {string} [options.iosSetupScriptPath]
 *   Path (relative to project root) to AppLovinQualityServiceSetup-ios.rb.
 *   Download it from AppLovin dashboard → MAX → Ad Review → Download Setup
 *   Script iOS and commit it to your repo. The script has a DIFFERENT
 *   embedded key (not the same string as androidReportKey) that AppLovin
 *   injects at download time, so this library cannot bundle a copy
 *   without leaking another publisher's credentials. If omitted, iOS Ad
 *   Review is skipped entirely.
 *
 * At least ONE of `androidReportKey` or `iosSetupScriptPath` must be
 * provided — otherwise there's nothing for this plugin to do.
 *
 * @example
 *   // Both platforms
 *   adReview: {
 *     androidReportKey: "861def8...",
 *     iosSetupScriptPath: "scripts/AppLovinQualityServiceSetup-ios.rb",
 *   }
 *
 * @example
 *   // Android only
 *   adReview: { androidReportKey: "861def8..." }
 *
 * @example
 *   // iOS only
 *   adReview: { iosSetupScriptPath: "scripts/AppLovinQualityServiceSetup-ios.rb" }
 */
function withAppLovinQualityService(config, options = {}) {
	// Support legacy `apiKey` as an alias for `androidReportKey` to keep
	// parity with @crassaert/applovin-quality-service-expo-plugin's option
	// shape. New code should prefer `androidReportKey`.
	const androidReportKey = options.androidReportKey ?? options.apiKey;
	const { iosSetupScriptPath } = options;

	if (!androidReportKey && !iosSetupScriptPath) {
		throw new Error(
			"[AppLovinQualityService] At least one of `androidReportKey` or `iosSetupScriptPath` must be set. " +
				"Pass `androidReportKey` (Report Key from AppLovin dashboard → Account → Keys) for Android, " +
				"and/or `iosSetupScriptPath` (path to AppLovinQualityServiceSetup-ios.rb downloaded from AppLovin dashboard) for iOS.",
		);
	}

	const plugins = [];
	if (androidReportKey) {
		plugins.push(withAppLovinQualityServiceProjectGradle);
		plugins.push([
			withAppLovinQualityServiceAppGradle,
			{ apiKey: androidReportKey },
		]);
	}
	if (iosSetupScriptPath) {
		plugins.push([withAppLovinQualityServiceIOS, { iosSetupScriptPath }]);
	}
	return withPlugins(config, plugins);
}

module.exports = withAppLovinQualityService;
