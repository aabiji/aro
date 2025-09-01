import { useRouter } from "expo-router";
import { Text, Pressable, View } from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";

export function BackHeader({ title }: { title: string; }) {
  const router = useRouter();
  return (
    <View className="w-full flex-row items-center mb-2">
      <Pressable onPress={() => router.back()}>
        <Ionicons name="chevron-back-outline" size={35} color="gray" />
      </Pressable>
      <Text className="text-xl ml-2 text-gray-600">{title}</Text>
    </View>
  );
}
