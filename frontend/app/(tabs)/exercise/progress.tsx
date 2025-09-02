import { useEffect, useState } from "react";
import { ExerciseType, useStore } from "@/lib/state";

import { FlatList, Pressable, Text, View } from "react-native";
import { LineGraph, Heatmap, PlotPoint } from "@/components/graph";
import { Container, Card } from "@/components/container";
import { Dropdown } from "@/components/elements";
import { BackHeader } from "@/components/header";

import Ionicons from "@expo/vector-icons/Ionicons";

type Vec2 = { x: number; y: number };
type ToVec2 = (v: any) => Vec2;

// Get the perpendicular distance from a point (p0), to a line segment (p1 to p2)
// Taken from [here](https://en.wikipedia.org/wiki/Distance_from_a_point_to_a_line)
function perpendicularDistance(p0: Vec2, p1: Vec2, p2: Vec2) {
  const num = (p2.y - p1.y) * p0.x - (p2.x - p1.x) * p0.y + p2.x * p1.y - p2.y * p1.x;
  const den = (p2.y - p1.y) * (p2.y - p1.y) + (p2.x - p1.x) * (p2.x - p1.x);
  return Math.abs(num) / Math.sqrt(den);
}

// Algorithm to simplify a curve by removing points
// Taken from [here](https://en.wikipedia.org/wiki/Ramer%E2%80%93Douglas%E2%80%93Peucker_algorithm)
function ramerDouglasPeuker(points: any[], epsilon: number, toVec2: (v: any) => Vec2): any[] {
  // find the point with the max distance to the current line segment
  let maxDistance = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(
      toVec2(points[i]),
      toVec2(points[0]),
      toVec2(points[points.length - 1]),
    );
    if (d > maxDistance) {
      maxDistance = d;
      index = i;
    }
  }

  // this works because as we recurse more and more, we're
  // selectively *ignoring* points, which simplifies the plot
  let resultingPoints: any[] = [];
  if (maxDistance > epsilon) {
    const left = ramerDouglasPeuker(points.slice(0, index), epsilon, toVec2);
    const right = ramerDouglasPeuker(points.slice(index), epsilon, toVec2);
    resultingPoints = [...left.slice(-1), ...right];
  } else {
    resultingPoints = [points[0], points[points.length - 1]];
  }

  return resultingPoints;
}

function simplifyGraph(points: any[], targetLength: number, toVec2: ToVec2): Promise<any[]> {
  if (points.length <= targetLength) return Promise.resolve(points);

  const epsilon = Math.floor(points.length / targetLength / 2);
  return Promise.resolve(ramerDouglasPeuker(points, epsilon, toVec2));
}

interface MonthInterval {
  index: number; // Index inside the array of plot points marking the new month
  elapsed: number; // Number of months between this interval and the next interval
}

interface PlotGroup {
  exerciseType: ExerciseType;
  data: PlotPoint[];
  months: MonthInterval[]; // from earliest to latest
}

function monthDiff(earliest: Date, latest: Date): number {
  const years = latest.getFullYear() - earliest.getFullYear();
  return Math.abs(latest.getMonth() - earliest.getMonth() + 12 * years);
}

// get the index of the plot point that's n months in the past
function getMonthIndex(monthIntervals: MonthInterval[], n: number): number {
  let count = 0;
  let start = 0;

  for (let i = monthIntervals.length - 1; i >= 0; i--) {
    const m = monthIntervals[i];
    count += m.elapsed;
    if (count >= n) {
      start = m.index;
      break;
    }
  }

  return start;
}

function ResistancePlot({ name, group }: { name: string; group: PlotGroup }) {
  const viewRanges = [
    { label: "This month", value: 1 },
    { label: "Last 6 months", value: 6 },
    { label: "This year", value: 12 },
    { label: "Last 5 years", value: 60 },
    {
      label: "All time",
      value: monthDiff(group.data[0].date, group.data[group.data.length - 1].date),
    },
  ];
  const [viewRange, setViewRange] = useState(0);

  const views = ["Weight", "Reps"];
  const [view, setView] = useState(0);

  const [showWeight, setShowWeight] = useState(true);
  const [startIndex, setStartIndex] = useState(getMonthIndex(group.months, 1));
  const [simplifiedGraph, setSimplifiedGraph] = useState([] as PlotPoint[]);

  useEffect(() => {
    const targetPoints = 100;
    const toVec2 = (v: PlotPoint) => ({
      x: v.date.getTime(),
      y: showWeight ? v.weight : v.averageReps,
    });

    const points: PlotPoint[] = group.data.slice(startIndex, group.data.length);
    simplifyGraph(points, targetPoints, toVec2).then((simplified) => setSimplifiedGraph(simplified));
  }, [startIndex, showWeight, group.data]);

  const changeViewRange = (numMonths: number) => {
    // the dates are in ascending order, so by changing the index at which
    // we slice the plot points, we change what the oldest plot point will be (change range)
    setStartIndex(getMonthIndex(group.months, numMonths));
  };

  const getValue = (v: PlotPoint) => (showWeight ? v.weight : v.averageReps);

  return (
    <Card>
      <View className="flex-row justify-between items-center">
        <Text className="text-xl">{name}</Text>

        <View className="flex-row gap-2">
          <Dropdown
            options={views}
            current={view}
            setCurrent={(index: number) => {
              setShowWeight(index === 0);
              setView(index);
            }}
            currentElement={
              <Text className="text-surface-color px-3">{views[view]}</Text>
            }
            optionElement={(index: number) =>
              <Text>{views[index]}</Text>}
          />

          <Dropdown
            options={viewRanges}
            current={viewRange}
            setCurrent={(index: number) => {
              setViewRange(index);
              changeViewRange(viewRanges[index].value);
            }}
            currentElement={
              <Text className="text-surface-color px-3">{viewRanges[viewRange].label}</Text>
            }
            optionElement={(index: number) =>
              <Text>{viewRanges[index].label}</Text>
            }
          />
        </View>
      </View>

      <LineGraph
        data={simplifiedGraph}
        tooltipLabel={showWeight ? "lbs" : "reps"}
        height={400} getValue={getValue} />
    </Card>
  );
}

function CardioPlot({ name, group }: { name: string; group: PlotGroup }) {
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

  const getValue = (v: PlotPoint) => (showDistance ? v.distance : v.duration);

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
    const startDiff = monthDiff(rangeStart, latest);
    setStartIndex(getMonthIndex(group.months, startDiff));

    const rangeEnd =
      nextYear + 1 > latest.getFullYear() ? latest : new Date(nextYear + 1, 0, 1);
    const endDiff = monthDiff(rangeEnd, latest);
    setEndIndex(getMonthIndex(group.months, endDiff));
  };

  useEffect(() => changeYear(0), []);

  return (
    <Card>
      <View className="flex-row justify-between items-center">
        <Text className="text-xl">{name}</Text>

        <View className="flex-row gap-4">
          <Dropdown
            options={dropdownOptions}
            current={dropdownOption}
            setCurrent={(index: number) => {
              setDropdownOption(index);
              setShowDistance(index === 0);
            }}
            currentElement={
              <Text className="text-surface-color px-3">{dropdownOptions[dropdownOption]}</Text>
            }
            optionElement={(index: number) =>
              <Text>{dropdownOptions[index]}</Text>
            }
          />

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

  let exercises: Record<string, PlotGroup> = {};
  for (let j = 0; j < 2; j++) {
    const name = `Dummy exercise #${j + 1}`;
    const etype = [ExerciseType.Resistance, ExerciseType.Cardio][j];

    const now = new Date();
    const start = new Date(new Date().setFullYear(new Date().getFullYear() - 2));
    let data: PlotPoint[] = [];

    for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
      data.push({
        date: new Date(d),
        weight: Math.floor(Math.random() * 150),
        distance: Math.floor(Math.random() * 200),
        duration: 60 + Math.floor(Math.random() * 180),
        averageReps: Math.floor(Math.random() * 5),
      });
    }

    data.sort((a, b) => a.date.getTime() - b.date.getTime()); // earliest to latest

    // get the month intervals
    let monthIntervals = [{ elapsed: 1, index: 0 }];
    for (let index = 1; index < data.length; index++) {
      const date = data[index].date;
      const prev = data[index - 1].date;
      if (date.getMonth() != prev.getMonth())
        monthIntervals.push({ elapsed: monthDiff(prev, date), index });
    }

    exercises[name] = { exerciseType: etype, data, months: monthIntervals };
  }

  return (
    <Container>
      <BackHeader title={"Progress"} />

      {Object.keys(exercises).length == 0 && (
        <Text className="text-center text-xl text-neutral-500">You have no exercises</Text>
      )}

      <FlatList
        data={Object.keys(exercises)}
        renderItem={({ item }) => {
          if (exercises[item].exerciseType == ExerciseType.Resistance)
            return <ResistancePlot group={exercises[item]} name={item} />;
          return <CardioPlot group={exercises[item]} name={item} />;
        }} />
    </Container>
  );
}
