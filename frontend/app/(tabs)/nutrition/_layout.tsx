import { Stack } from "expo-router";
import Navbar from "@/components/navbar";

export default function NutritionStackLayout() {
  const panes = ["Search"];
  const routes = ["index"];

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Search",
          header: ({ route }) => (
            <Navbar routes={routes} panes={panes} route={route.name} />
          ),
        }} />
    </Stack>
  );
}
