import { useRouter } from "expo-router";

import { Pressable, Text, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";

export default function Navbar({ routes, panes, icons, route }) {
  const router = useRouter();

  return (
    <View className="flex-row w-full bg-default-background">
      {panes.map((_, i) => {
        const extra = routes[i] == route ? "border-b-2 border-primary-600" : "";
        return (
          <View key={i} className={`${extra} grow justify-evenly items-center`}>
            <Pressable
              className="p-2 grow flex-row items-center"
              onPress={() => {
                router.push(`exercise/${routes[i].replace("index", "")}`);
              }}
            >
              <Feather name={icons[i]} color="black" size={18} />
              <Text className="font-bold ml-2">{panes[i]}</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}
