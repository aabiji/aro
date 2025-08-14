import "../global.css";
import { Provider } from "react-redux";
import { store } from "@/lib/state";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Provider store={store}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </Provider>
  );
}
