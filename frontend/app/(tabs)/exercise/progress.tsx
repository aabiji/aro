import { useEffect, useState } from "react";
import { ExerciseType, useStore } from "@/lib/state";
import * as plot from "@/lib/plot";

import { FlatList, Pressable, Text, View } from "react-native";
import { Heatmap, TimeSeriesChart } from "@/components/graph";
import { Container, Card } from "@/components/container";
import { Dropdown } from "@/components/elements";
import { BackHeader } from "@/components/header";

import Ionicons from "@expo/vector-icons/Ionicons";

export interface Group {
  exerciseType: ExerciseType;
  data: plot.PlotPoint[];
  months: plot.MonthInterval[]; // from earliest to latest
}

function ResistancePlot({ name, group }: { name: string, group: Group }) {
  const views = ["Weight", "Reps"];
  const [view, setView] = useState(0);
  const [showWeight, setShowWeight] = useState(true);

  const toVec2 = (v: plot.PlotPoint) => ({
    x: v.date.getTime(),
    y: showWeight ? v.weight : v.averageReps,
  });

  const getValue = (v: plot.PlotPoint) => (showWeight ? v.weight : v.averageReps);

  return (
    <TimeSeriesChart
      name={name} data={group.data} months={group.months}
      getValue={getValue} toVec2={toVec2}
      tooltipLabel={showWeight ? "lbs" : "reps"}>
      <Dropdown
        options={views}
        current={view}
        setCurrent={(index: number) => {
          setShowWeight(index === 0);
          setView(index);
        }}
        currentElement={
          <Text className="text-xs text-surface-color px-3">{views[view]}</Text>
        }
        optionElement={(index: number) =>
          <Text>{views[index]}</Text>}
      />
    </TimeSeriesChart>
  )
}

function CardioPlot({ name, group }: { name: string; group: Group }) {
  const earliest = group.data[0].date;
  const latest = group.data[group.data.length - 1].date;

  const [year, setYear] = useState(latest.getFullYear());
  const [prevDisabled, setPrevDisabled] = useState(false);
  const [nextDisabled, setNextDisabled] = useState(false);
  const [showDistance, setShowDistance] = useState(true);

  const dropdownOptions = ["Distance", "Duration"];
  const [dropdownOption, setDropdownOption] = useState(0);

  const [startIndex, setStartIndex] = useState(group.data.length - 1);
  const [endIndex, setEndIndex] = useState(group.data.length - 1);

  const getValue = (v: plot.PlotPoint) => (showDistance ? v.distance : v.duration);

  useEffect(() => {
    setPrevDisabled(year <= earliest.getFullYear());
    setNextDisabled(year >= latest.getFullYear());
  }, [year, latest, earliest]);

  const changeYear = (delta: number) => {
    const nextYear = year + delta;
    if (nextYear < earliest.getFullYear() || nextYear > latest.getFullYear()) return;
    setYear(nextYear);

    // Set the start and end indexes for the slice of plot points
    // that'll be in the range of the currently selected year
    // (from the start of the year to the start of the next year or the latest date)

    const rangeStart = new Date(nextYear, 0, 1);
    const startDiff = plot.monthDiff(rangeStart, latest);
    setStartIndex(plot.getMonthIndex(group.months, startDiff));

    const rangeEnd =
      nextYear + 1 > latest.getFullYear() ? latest : new Date(nextYear + 1, 0, 1);
    const endDiff = plot.monthDiff(rangeEnd, latest);
    setEndIndex(plot.getMonthIndex(group.months, endDiff));
  };

  useEffect(() => changeYear(0), []);

  return (
    <Card>
      <View className="flex-column">
        <View className="flex-row justify-between w-[100%]">
          <Text className="text-xl">{name}</Text>

          <View className="flex-row gap-2 items-center">
            <Pressable onPress={() => changeYear(-1)} disabled={prevDisabled}>
              <Ionicons
                name="arrow-back" size={18}
                color={prevDisabled ? "neutral" : "black"} />
            </Pressable>
            <Text className="text-base"> {year} </Text>
            <Pressable onPress={() => changeYear(1)} disabled={nextDisabled}>
              <Ionicons
                name="arrow-forward" size={18}
                color={nextDisabled ? "neutral" : "black"} />
            </Pressable>
          </View>
        </View>

        <Dropdown
          options={dropdownOptions}
          current={dropdownOption}
          setCurrent={(index: number) => {
            setDropdownOption(index);
            setShowDistance(index === 0);
          }}
          currentElement={
            <Text className="text-xs text-surface-color px-3">
              {dropdownOptions[dropdownOption]}
            </Text>
          }
          optionElement={(index: number) =>
            <Text className="text-xs px-3">
              {dropdownOptions[index]}
            </Text>
          }
        />
      </View>

      <Heatmap
        data={group.data.slice(startIndex, endIndex + 1)}
        tooltipLabel={showDistance ? "km" : "min"}
        height={150} getValue={getValue} />
    </Card>
  );
}

export default function ProgressPage() {
  const store = useStore();

  /*
  // map the data into a set of plot points, and group by exercise
  let exercises: Record<string, PlotGroup> = {};
  for (const w of Object.values(store.workouts)) {
    if (w.isTemplate) continue;
    for (const e of w.exercises) {
      const point = {
        date: new Date(w.tag),
        weight: e.weight ?? 0,
        duration: e.duration ?? 0,
        distance: e.distance ?? 0,
        averageReps: e.reps.length
          ? e.reps.reduce((a, b) => a + b, 0) / e.reps.length
          : 0,
      };

      if (exercises[e.name] === undefined)
        exercises[e.name] = {
          exerciseType: e.exerciseType,
          data: [point],
          months: [],
        };
      else exercises[e.name].data.push(point);
    }
  }

  for (let name in exercises) {
    // sort earliest to latest
    exercises[name].data.sort((a, b) => a.date.getTime() - b.date.getTime());

    // get the month intervals
    exercises[name].months = [{ elapsed: 1, index: 0 }];
    for (let index = 1; index < exercises[name].data.length; index++) {
      const date = exercises[name].data[index].date;
      const prev = exercises[name].data[index - 1].date;
      if (date.getMonth() !== prev.getMonth())
        exercises[name].months.push({ elapsed: monthDiff(prev, date), index });
    }
  }
  */

  let exercises: Record<string, Group> = {};
  for (let j = 0; j < 2; j++) {
    const name = `Dummy exercise #${j + 1}`;
    const etype = [ExerciseType.Cardio, ExerciseType.Resistance][j];

    const now = new Date();
    const start = new Date(new Date().setFullYear(new Date().getFullYear() - 2));
    let data: plot.PlotPoint[] = [];

    for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
      data.push({
        date: new Date(d),
        weight: Math.floor(Math.random() * 150),
        distance: Math.floor(Math.random() * 200),
        duration: 60 + Math.floor(Math.random() * 180),
        averageReps: Math.floor(Math.random() * 5),
      });
    }

    const { sortedData, monthIntervals } = plot.processData(data);
    exercises[name] = { exerciseType: etype, data: sortedData, months: monthIntervals };
  }

  return (
    <Container>
      <BackHeader title={"Progress"} />

      {Object.keys(exercises).length === 0 && (
        <Text className="text-center text-xl text-neutral-500">You have no exercises</Text>
      )}

      <FlatList
        data={Object.keys(exercises)}
        renderItem={({ item }) => {
          if (exercises[item].exerciseType === ExerciseType.Resistance)
            return <ResistancePlot group={exercises[item]} name={item} />;
          return <CardioPlot group={exercises[item]} name={item} />;
        }} />
    </Container>
  );
}
