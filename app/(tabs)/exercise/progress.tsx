import { View } from "react-native";
import { LineGraph, Heatmap } from "@/components/graph";
import { ScrollContainer } from "@/components/container";

export default function ProgressPage() {
  const now = new Date();
  const lastYear = new Date(new Date().setFullYear(new Date().getFullYear() - 1));
  const data = [];
  for (let d = new Date(lastYear); d <= now; d.setDate(d.getDate() + 1)) {
    data.push({ date: new Date(d), value: Math.floor(Math.random() * 100) });
  }

  return (
    <ScrollContainer>
      <View className="gap-4">
        <Heatmap data={data} height={150} />
        <LineGraph data={data} height={400} />
      </View>
    </ScrollContainer>
  );
}
