import { Tabs } from "expo-router";
import { useStore } from "@/lib/state";

import Ionicons from "@expo/vector-icons/Ionicons";

export default function TabLayout() {
  // TODO: more secure check, see (tabs)/index.tsx also
  const store = useStore();
  const authenticated = store.jwt.length > 0;

  return (
    <Tabs
      screenOptions={({ route }) => {
        return {
          tabBarShowLabel: false,
          tabBarStyle: route.name === "index"
            ? { display: "none" }
            : { backgroundColor: "white", borderTopColor: "#d1d5db", elevation: 0, paddingTop: 6 },
          tabBarActiveTintColor: "#60a5fa",
          tabBarInactiveTintColor: "#6b7280",
          tabBarIcon: ({ color }) => {
            const icons = {
              index: "barbell-outline", exercise: "barbell-outline",
              food: "fast-food-outline", period: "water",
              settings: "settings-outline", weight: "scale-outline",
            };
            return <Ionicons name={icons[route.name]} color={color} size={24} />;
          },
        };
      }}>
      <Tabs.Screen
        name="index"
        options={{ headerShown: false, tabBarItemStyle: { display: "none" } }} />
      <Tabs.Protected guard={authenticated}>
        <Tabs.Screen name="food" options={{ title: "Food", headerShown: false }} />
        <Tabs.Screen name="exercise" options={{ title: "Exercise", headerShown: false }} />
        <Tabs.Screen name="weight" options={{ title: "Weight", headerShown: false }} />
        <Tabs.Screen name="period" options={{ title: "Period", headerShown: false }} />
        <Tabs.Screen name="settings" options={{ title: "Settings", headerShown: false }} />
      </Tabs.Protected>
    </Tabs>
  );
}
