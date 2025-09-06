import { useEffect, useState, useRef } from "react";
import { useStore } from "@/lib/state";
import * as plot from "@/lib/plot";

import { FlatList, Text, View } from "react-native";
import { TimeSeriesChart } from "@/components/graph";
import { Container, Card, Input } from "@/components/elements";
import useDelayedAction from "@/lib/action";

export default function Weightlog() {
  const store = useStore();

  // TODO: now just call this function when we input or change state
  // do the same for workouts as well...and remove <Container sync>
  // then simplify backend requests
  // Then add the "weekly" button to this graph
  // Then, make the progess page work
  const trigger = useDelayedAction();
  const update = () => {
    console.log("api requests go here...");
  }

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
        <View className="flex-row justify-between px-4 items-center">
          <Text className="font-bold">Today</Text>
          <Input text={`${currentWeight}`} placeholder="0" numeric
            label={store.useImperial ? "lbs" : "kg"}
            setText={(txt: string) => setCurrentWeight(Number(txt.trim()))} />
        </View>

        <View className="flex-row justify-between px-4 items-center">
          <Text>Date</Text>
          <Text>X lbs</Text>
        </View>
      </Card>
    </Container>
  );
}
