import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ tabBarItemStyle: { display: "none" } }} />
      <Tabs.Screen
        name="exercise"
        options={{ title: "Exercise", headerShown: false }} />
    </Tabs>
  );
}
