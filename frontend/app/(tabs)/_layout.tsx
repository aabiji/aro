import { Tabs } from "expo-router";

import DumbellIcon from '@/assets/dumbell.svg';
import FoodIcon from '@/assets/food.svg';
import DropIcon from '@/assets/drop.svg';
import GearIcon from '@/assets/gear.svg';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => {
        const icons = {
          "index": DumbellIcon, "exercise": DumbellIcon,
          "food": FoodIcon, "period": DropIcon, "settings": GearIcon
        };
        const isIndex = route.name == "index";

        return {
          tabBarShowLabel: false,
          tabBarStyle: isIndex ?
            { display: "none" }
            : { backgroundColor: "transparent", borderTopColor: "#d1d5db", elevation: 0 },
          tabBarActiveTintColor: "#60a5fa",
          tabBarInactiveTintColor: "#6b7280",
          tabBarIcon: ({ color }) => {
            const Icon = icons[route.name];
            return <Icon fill={color} />
          }
        };
      }}>
      <Tabs.Screen name="index" options={{
        headerShown: false, tabBarItemStyle: { display: "none" }
      }} />
      <Tabs.Screen
        name="exercise"
        options={{ title: "Exercise", headerShown: false }} />
      <Tabs.Screen
        name="settings"
        options={{ title: "Settings", headerShown: false }} />
    </Tabs>
  );
}
