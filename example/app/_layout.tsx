import { Stack } from "expo-router";

export default function RootLayout() {
	return (
		<Stack
			screenOptions={{
				headerStyle: { backgroundColor: "#000" },
				headerTintColor: "#fff",
				contentStyle: { backgroundColor: "#000" },
			}}
		>
			<Stack.Screen name="index" options={{ title: "AppLovin MAX Example" }} />
		</Stack>
	);
}
