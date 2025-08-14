import { Tabs } from "expo-router";

import DumbellIcon from '@/assets/dumbell.svg';
import FoodIcon from '@/assets/food.svg';
import DropIcon from '@/assets/drop.svg';
import GearIcon from '@/assets/gear.svg';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: "transparent",
          borderTopColor: "#d1d5db",
          elevation: 0,
        },
        tabBarActiveTintColor: "#60a5fa",
        tabBarInactiveTintColor: "#6b7280",
        tabBarIcon: ({ color }) => {
          const icons = {
            "index": DumbellIcon, "exercise": DumbellIcon,
            "food": FoodIcon, "period": DropIcon, "settings": GearIcon
          };
          const Icon = icons[route.name];
          return <Icon fill={color} />
        }
      })}>
      <Tabs.Screen name="index" options={{ tabBarItemStyle: { display: "none" } }} />
      <Tabs.Screen
        name="exercise"
        options={{ title: "Exercise", headerShown: false }} />
    </Tabs>
  );
}
