import { Stack } from "expo-router";

export default function ExerciseStackLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Workouts", headerShown: false }} />
      <Stack.Screen name="progress" options={{ title: "Progress", headerShown: false }} />
      <Stack.Screen name="templates" options={{ title: "Templates", headerShown: false }} />
    </Stack>
  );
}
