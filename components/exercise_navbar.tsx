import { useRouter } from 'expo-router';

import { Pressable, Text, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";

export default function ExerciseNavbar({ route }: { route: string }) {
  const icons = ["list", "book", "pie-chart"];
  const panes = ["Log", "Templates", "Progress"];

  const routes = ["index", "templates", "progress"];
  const router = useRouter();

  return (
    <View className="flex-row w-full">
      {panes.map((_, i) => {
        const extra = routes[i] == route ? "border-b-4 border-blue-200" : "";
        return (
          <View key={i}
            className={`${extra} grow justify-evenly items-center`}>
            <Pressable
              className="p-2 grow flex-row items-center"
              onPress={() => {
                router.push(`exercise/${routes[i].replace('index', '')}`);
              }}>
              <Feather name={icons[i]} color="black" size={18} />
              <Text className="ml-3">{panes[i]}</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}
