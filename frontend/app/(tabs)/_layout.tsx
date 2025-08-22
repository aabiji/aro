import { Tabs } from "expo-router";
import { useSelector } from "react-redux";

import DumbellIcon from "@/assets/dumbell.svg";
import FoodIcon from "@/assets/food.svg";
import CalendarIcon from "@/assets/calendar.svg";
import GearIcon from "@/assets/gear.svg";

export default function TabLayout() {
  // TODO: more secure check, see (tabs)/index.tsx also
  const userData = useSelector((state) => state.userData);
  const authenticated = userData.jwt.length > 0;

  return (
    <Tabs
      screenOptions={({ route }) => {
        const icons = {
          index: DumbellIcon,
          exercise: DumbellIcon,
          food: FoodIcon,
          tags: CalendarIcon,
          settings: GearIcon,
        };
        const isIndex = route.name == "index";

        return {
          tabBarShowLabel: false,
          tabBarStyle: isIndex
            ? { display: "none" }
            : {
                backgroundColor: "transparent",
                borderTopColor: "#d1d5db",
                elevation: 0,
              },
          tabBarActiveTintColor: "#60a5fa",
          tabBarInactiveTintColor: "#6b7280",
          tabBarIcon: ({ color }) => {
            const Icon = icons[route.name];
            return <Icon fill={color} stroke={color} />;
          },
        };
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false,
          tabBarItemStyle: { display: "none" },
        }}
      />
      <Tabs.Protected guard={authenticated}>
        <Tabs.Screen
          name="exercise"
          options={{ title: "Exercise", headerShown: false }}
        />
        <Tabs.Screen name="tags" options={{ title: "Tags", headerShown: false }} />
        <Tabs.Screen
          name="settings"
          options={{ title: "Settings", headerShown: false }}
        />
      </Tabs.Protected>
    </Tabs>
  );
}
