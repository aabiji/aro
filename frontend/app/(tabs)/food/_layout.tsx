import { Stack } from "expo-router";

export default function FoodStackLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Index", headerShown: false }} />
      <Stack.Screen name="scan" options={{ title: "Scan", headerShown: false }} />
      <Stack.Screen name="search" options={{ title: "Search", headerShown: false }} />
      <Stack.Screen name="info" options={{ title: "Info", headerShown: false }} />
    </Stack>
  );
}
