import Constants from "expo-constants";
import { useEffect, useState } from "react";
import {
	ActivityIndicator,
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";
import AppLovinMAX from "react-native-applovin-max";

const APPLOVIN_SDK_KEY = (Constants.expoConfig?.extra?.applovinSdkKey ??
	"") as string;

type SdkStatus = "idle" | "initializing" | "ready" | "error";

export default function HomeScreen() {
	const [status, setStatus] = useState<SdkStatus>("idle");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;

		async function init() {
			if (!APPLOVIN_SDK_KEY) {
				setStatus("error");
				setErrorMessage(
					"AppLovin SDK Key is missing. Set extra.applovinSdkKey in app.config.ts.",
				);
				return;
			}

			setStatus("initializing");
			try {
				await AppLovinMAX.initialize(APPLOVIN_SDK_KEY);
				if (cancelled) return;
				setStatus("ready");

				// Auto-open the Mediation Debugger as soon as the SDK is ready
				// so we can verify that adapters / SKAdNetwork / Ad Review are
				// all wired correctly. A small delay ensures the navigator
				// container has mounted on iOS.
				setTimeout(() => {
					if (cancelled) return;
					AppLovinMAX.showMediationDebugger();
				}, 500);
			} catch (e) {
				if (cancelled) return;
				setStatus("error");
				setErrorMessage(e instanceof Error ? e.message : String(e));
			}
		}

		init();
		return () => {
			cancelled = true;
		};
	}, []);

	return (
		<View style={styles.container}>
			<Text style={styles.title}>AppLovin MAX Example</Text>
			<Text style={styles.subtitle}>@fumitakayamada/expo-applovin-max</Text>

			<View style={styles.statusBox}>
				<Text style={styles.statusLabel}>SDK status</Text>
				<Text style={styles.statusValue}>{status}</Text>
				{status === "initializing" ? (
					<ActivityIndicator color="#fff" style={{ marginTop: 8 }} />
				) : null}
				{errorMessage ? (
					<Text style={styles.errorText}>{errorMessage}</Text>
				) : null}
			</View>

			<Pressable
				style={({ pressed }) => [
					styles.button,
					pressed && styles.buttonPressed,
					status !== "ready" && styles.buttonDisabled,
				]}
				disabled={status !== "ready"}
				onPress={() => AppLovinMAX.showMediationDebugger()}
			>
				<Text style={styles.buttonText}>Open Mediation Debugger</Text>
			</Pressable>

			<Text style={styles.hint}>
				The Mediation Debugger should auto-open on launch. If it didn't, tap the
				button above. Use it to verify which adapters loaded, whether Ad Review
				is active, and whether SKAdNetwork IDs are present.
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#000",
		alignItems: "center",
		justifyContent: "center",
		padding: 24,
	},
	title: {
		color: "#fff",
		fontSize: 28,
		fontWeight: "700",
		marginBottom: 4,
	},
	subtitle: {
		color: "#888",
		fontSize: 14,
		marginBottom: 32,
	},
	statusBox: {
		backgroundColor: "#1a1a1a",
		borderRadius: 12,
		padding: 16,
		marginBottom: 24,
		minWidth: 240,
		alignItems: "center",
	},
	statusLabel: {
		color: "#888",
		fontSize: 12,
		textTransform: "uppercase",
		letterSpacing: 1,
	},
	statusValue: {
		color: "#fff",
		fontSize: 20,
		fontWeight: "600",
		marginTop: 4,
	},
	errorText: {
		color: "#ff5555",
		fontSize: 12,
		marginTop: 8,
		textAlign: "center",
	},
	button: {
		backgroundColor: "#0a84ff",
		paddingHorizontal: 24,
		paddingVertical: 14,
		borderRadius: 10,
		marginBottom: 16,
	},
	buttonPressed: {
		opacity: 0.7,
	},
	buttonDisabled: {
		backgroundColor: "#333",
	},
	buttonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
	},
	hint: {
		color: "#666",
		fontSize: 12,
		textAlign: "center",
		lineHeight: 18,
		maxWidth: 320,
	},
});
