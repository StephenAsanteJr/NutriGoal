import Ionicons from "@expo/vector-icons/Ionicons";
import { Redirect, Tabs } from "expo-router";
import { View } from "react-native";
import { useSession } from "@/lib/session";
import { useData } from "@/lib/useData";
import { HomeContext, type Home } from "@/lib/home";
import { C } from "@/lib/theme";
import type { IconName } from "@/components/Rows";

type Role = "member" | "clinician" | "manager";

/** Which tabs each role sees; the rest stay reachable by link (e.g. the bell opens Alerts) but get no tab. */
const TABS: Record<string, { title: string; icon: IconName; roles: Role[] }> = {
  home: { title: "Home", icon: "home", roles: ["member", "clinician", "manager"] },
  tickets: { title: "Tickets", icon: "document-text", roles: ["member", "clinician", "manager"] },
  build: { title: "Build", icon: "body", roles: ["member"] },
  marketplace: { title: "Market", icon: "storefront", roles: ["member"] },
  alerts: { title: "Alerts", icon: "notifications", roles: ["clinician"] },
  team: { title: "Team", icon: "people", roles: ["manager"] },
  account: { title: "Account", icon: "person-circle", roles: ["member", "clinician", "manager"] },
};

function TabIcon({ name, focused, color }: { name: IconName; focused: boolean; color: string }) {
  return (
    <View style={{ width: 54, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: focused ? C.redTint : "transparent" }}>
      <Ionicons name={(focused ? name : `${name}-outline`) as IconName} size={22} color={color} />
    </View>
  );
}

export default function TabsLayout() {
  const { token, role, ready } = useSession();
  const home = useData<Home>(token ? "home" : null);
  if (ready && !token) return <Redirect href="/" />;
  const r: Role = role ?? "member";
  const d = home.data;
  const badges: Record<string, number | undefined> = {
    tickets: d?.role === "clinician" ? d.counts.open || undefined : d?.role === "manager" ? d.kpis.dueSoon || undefined : undefined,
    alerts: d && d.unread ? d.unread : undefined,
  };

  return (
    <HomeContext.Provider value={home}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: C.red,
          tabBarInactiveTintColor: C.muted,
          tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
          tabBarStyle: { backgroundColor: C.white, borderTopColor: C.line },
          tabBarBadgeStyle: { backgroundColor: C.red, color: C.white, fontSize: 10, fontWeight: "800" },
          sceneStyle: { backgroundColor: C.mist },
        }}
      >
        {Object.entries(TABS).map(([name, t]) => (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              title: name === "tickets" && r === "clinician" ? "Queue" : t.title,
              href: t.roles.includes(r) ? undefined : null,
              tabBarBadge: badges[name],
              tabBarIcon: ({ focused, color }) => <TabIcon name={name === "tickets" && r === "clinician" ? "file-tray-full" : t.icon} focused={focused} color={typeof color === "string" ? color : C.muted} />,
            }}
          />
        ))}
      </Tabs>
    </HomeContext.Provider>
  );
}
