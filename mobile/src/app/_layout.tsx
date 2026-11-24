import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SessionProvider } from "@/lib/session";
import { C } from "@/lib/theme";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: C.navy },
            headerTintColor: C.white,
            headerTitleStyle: { fontWeight: "800" },
            contentStyle: { backgroundColor: C.mist },
          }}
        >
          <Stack.Screen name="index" options={{ title: "NutriGoal" }} />
          <Stack.Screen name="build" options={{ title: "My build" }} />
          <Stack.Screen name="tickets/index" options={{ title: "Tickets" }} />
          <Stack.Screen name="tickets/[id]" options={{ title: "Ticket" }} />
          <Stack.Screen name="new-ticket" options={{ title: "New goal ticket" }} />
          <Stack.Screen name="respond/[id]" options={{ title: "Write response" }} />
          <Stack.Screen name="weigh-in" options={{ title: "Log weight" }} />
          <Stack.Screen name="marketplace" options={{ title: "Marketplace" }} />
          <Stack.Screen name="assistant" options={{ title: "Ask NutriGoal" }} />
          <Stack.Screen name="alerts" options={{ title: "Alerts" }} />
          <Stack.Screen name="team" options={{ title: "Clinicians" }} />
        </Stack>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
