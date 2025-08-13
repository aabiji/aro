import { Stack } from "expo-router";
import ExerciseNavbar from "@/components/exercise_navbar";

export default function ExerciseStackLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Workouts",
          header: ({ route }) => <ExerciseNavbar route={route.name} />,
        }}
      />
      <Stack.Screen
        name="progress"
        options={{
          title: "Progress",
          header: ({ route }) => <ExerciseNavbar route={route.name} />,
        }}
      />
      <Stack.Screen
        name="templates"
        options={{
          title: "Templates",
          header: ({ route }) => <ExerciseNavbar route={route.name} />,
        }}
      />
    </Stack>
  );
}
