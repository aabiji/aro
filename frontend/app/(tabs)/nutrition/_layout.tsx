import { Stack } from "expo-router";
import Navbar from "@/components/navbar";

export default function NutritionStackLayout() {
  const icons = ["search"];
  const panes = ["Search"];
  const routes = ["index"];

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Search",
          header: ({ route }) => (
            <Navbar
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
