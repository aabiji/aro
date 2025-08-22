import { Stack } from "expo-router";
import ExerciseNavbar from "@/components/navbar";

export default function ExerciseStackLayout() {
  const icons = ["list", "book", "pie-chart"];
  const panes = ["Log", "Templates", "Progress"];
  const routes = ["index", "templates", "progress"];

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Workouts",
          header: ({ route }) => (
            <ExerciseNavbar
              icons={icons}
              routes={routes}
              panes={panes}
              route={route.name}
            />
          ),
        }}
      />
      <Stack.Screen
        name="progress"
        options={{
          title: "Progress",
          header: ({ route }) => (
            <ExerciseNavbar
              icons={icons}
              routes={routes}
              panes={panes}
              route={route.name}
            />
          ),
        }}
      />
      <Stack.Screen
        name="templates"
        options={{
          title: "Templates",
          header: ({ route }) => (
            <ExerciseNavbar
              icons={icons}
              routes={routes}
              panes={panes}
              route={route.name}
            />
          ),
        }}
      />
    </Stack>
  );
}
