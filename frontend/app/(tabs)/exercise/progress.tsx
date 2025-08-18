import { Pressable, Text, View } from "react-native";
import { LineGraph, Heatmap } from "@/components/graph";
import { ScrollContainer } from "@/components/container";
import { Selection } from "@/components/select";
import Feather from "@expo/vector-icons/Feather";

export default function ProgressPage() {
  const now = new Date();
  const lastYear = new Date(new Date().setFullYear(new Date().getFullYear() - 1));
  const data = [];
  for (let d = new Date(lastYear); d <= now; d.setDate(d.getDate() + 1)) {
    data.push({ date: new Date(d), value: Math.floor(Math.random() * 100) });
  }

  return (
    <ScrollContainer>
      <View className="bg-white p-2 w-full mb-4">
        <View className="flex-row justify-between items-center">
          <Text className="text-xl"> Exercise name </Text>
          <View className="flex-row gap-2 items-center">
            <Pressable>
              <Feather name="arrow-left" color="black" size={18} />
            </Pressable>
            <Text className="text-base"> Year </Text>
            <Pressable>
              <Feather name="arrow-right" color="black" size={18} />
            </Pressable>
          </View>
        </View>
        <Heatmap data={data} height={150} />
      </View>

      <View className="bg-white p-2 w-full mb-4">
        <View className="items-center flex-row justify-between items-center">
          <Text className="text-xl"> Exercise name </Text>
          <Selection choices={["Weight", "Reps"]} handleChoice={(index) => { }} />
        </View>
        <LineGraph data={data} height={400} />
      </View>
    </ScrollContainer>
  );
}
