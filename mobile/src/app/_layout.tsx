import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SessionProvider } from "@/lib/session";
import { PlayerProvider } from "@/lib/player";
import { MiniPlayer } from "@/components/Player";
import { C } from "@/lib/theme";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <PlayerProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: C.mist },
              headerShadowVisible: false,
              headerTintColor: C.greenDeep,
              headerTitleStyle: { fontWeight: "800", color: C.ink },
              headerBackButtonDisplayMode: "minimal",
              contentStyle: { backgroundColor: C.mist },
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="tickets/[id]" options={{ title: "Ticket" }} />
            <Stack.Screen name="new-ticket" options={{ title: "New goal ticket" }} />
            <Stack.Screen name="respond/[id]" options={{ title: "Write response" }} />
            <Stack.Screen name="weigh-in" options={{ title: "Log weight" }} />
            <Stack.Screen name="assistant" options={{ title: "Ask NutriGoal" }} />
          </Stack>
          <MiniPlayer />
        </PlayerProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
