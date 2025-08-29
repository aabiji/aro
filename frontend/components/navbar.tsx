import { useRouter } from "expo-router";

import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Navbar({ routes, panes, route }) {
  const router = useRouter();

  return (
    <SafeAreaView edges={["top", "left", "right"]}>
      <View className="flex-row w-full bg-default-background">
        {panes.map((_, i) => {
          const extra = routes[i] == route ? "border-b-2 border-primary-600" : "";
          return (
            <View key={i} className={`${extra} grow justify-evenly items-center`}>
              <Pressable
                className="p-2 grow flex-row items-center"
                onPress={() => {
                  router.push(`exercise/${routes[i].replace("index", "")}`);
                }}>
                <Text className="ml-2">{panes[i]}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </SafeAreaView>
  );
}
