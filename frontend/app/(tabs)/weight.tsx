import { useState } from "react";
import { useStore } from "@/lib/state";
import * as plot from "@/lib/plot";

import { FlatList, Text, View } from "react-native";
import { Container, Card } from "@/components/container";
import { TimeSeriesChart } from "@/components/graph";
import { Input } from "@/components/elements";

export default function Weightlog() {
  const store = useStore();

  const [currentWeight, setCurrentWeight] = useState(0);

  const toVec2 = (v: plot.PlotPoint) => ({ x: v.date.getTime(), y: v.weight });
  const getValue = (v: plot.PlotPoint) => v.weight;

  let name = "Weight entries";
  let monthIntervals: plot.MonthInterval[] = [];
  let data: plot.PlotPoint[] = [];

  const now = new Date();
  const start = new Date(new Date().setFullYear(new Date().getFullYear() - 2));
  for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
    data.push({ date: new Date(d), weight: Math.floor(Math.random() * 150) });
  }

  const { sortedData, monthIntervals: months } = plot.processData(data);
  monthIntervals = months;
  data = sortedData;

  return (
    <Container>
      <TimeSeriesChart
        name={name} data={data} months={monthIntervals}
        getValue={getValue} toVec2={toVec2}
        tooltipLabel={"lbs"}>
        <Text>todo!</Text>
      </TimeSeriesChart>

      <Card>
        <View className="flex-row justify-between px-4">
          <Text className="font-bold">Today</Text>
          <Input text={`${currentWeight}`} placeholder="0" numeric
            setText={(txt: string) => setCurrentWeight(Number(txt.trim()))} />
        </View>

        <View className="flex-row justify-between px-4">
          <Text>Date</Text>
          <Text>X lbs</Text>
        </View>
      </Card>
    </Container>
  );
}
