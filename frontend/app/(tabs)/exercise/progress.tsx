import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

import { FlatList, Pressable, Text, View } from "react-native";
import { LineGraph, Heatmap } from "@/components/graph";
import { Empty, ScrollContainer } from "@/components/container";
import { Dropdown, Selection } from "@/components/select";
import Feather from "@expo/vector-icons/Feather";
import { ExerciseType } from "@/lib/state";

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
      toVec2(points[i]), toVec2(points[0]), toVec2(points[points.length - 1]));
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
  if (points.length <= targetLength)
    return Promise.resolve(points);

  const epsilon = Math.floor(points.length / targetLength / 2);
  return Promise.resolve(ramerDouglasPeuker(points, epsilon, toVec2));
}


interface PlotPoint {
  date: Date;
  weight: number;
  averageReps: number;
  distance: number;
  duration: number;
}

interface MonthInterval {
  index: number; // Index inside the array of plot points marking the new month
  elapsed: number; // Number of months between this interval and the next interval
}

interface PlotGroup {
  exercise_type: ExerciseType,
  data: PlotPoint[]
  months: MonthInterval[]; // from earliest to latest
}

function monthDiff(earliest: Date, latest: Date): number {
  const years = latest.getFullYear() - earliest.getFullYear();
  return Math.abs(latest.getMonth() - earliest.getMonth() + 12 * (years))
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
  const [update, setUpdate] = useState(true);
  const forceRerender = (ret: void) => setUpdate(!update);

  const viewRanges = [
    { label: "This month", value: 1 },
    { label: "Last 6 months", value: 6 },
    { label: "This year", value: 12 },
    { label: "Last 5 years", value: 60, },
    {
      label: "All time",
      value: monthDiff(group.data[0].date, group.data[group.data.length - 1].date)
    }
  ];

  const [viewRange, setViewRange] = useState(viewRanges[0].value);
  const [showWeight, setShowWeight] = useState(true);
  const [startIndex, setStartIndex] = useState(getMonthIndex(group.months, 1));
  const [simplifiedGraph, setSimplifiedGraph] = useState([] as PlotPoint[]);

  useEffect(() => {
    const targetPoints = 100;
    const toVec2 = (v: PlotPoint) =>
      ({ x: v.date.getTime(), y: showWeight ? v.weight : v.averageReps });
    const points: PlotPoint[] = group.data.slice(startIndex, group.data.length);

    simplifyGraph(points, targetPoints, toVec2).then((simplified) => {
      setSimplifiedGraph(simplified);
      forceRerender();
    });
  }, [startIndex, showWeight]);

  const changeViewRange = (numMonths: number) => {
    // the dates are in ascending order, so by changing the index at which
    // we slice the plot points, we change what the oldest plot point will be (change range)
    setStartIndex(getMonthIndex(group.months, numMonths));
    setViewRange(numMonths);
    forceRerender();
  }

  const getDate = (v: PlotPoint) => v.date;
  const getValue = (v: PlotPoint) => showWeight ? v.weight : v.averageReps;

  return (
    <View className="bg-white px-4 py-2 w-full mb-4">
      <View className="items-center flex-row justify-between items-center">
        <Text className="text-xl">{name}</Text>

        <View className="flex-column w-[25%]">
          <Selection
            choices={["Weight", "Reps"]}
            handleChoice={(index: number) => forceRerender(setShowWeight(index == 0))} />
          <Dropdown
            choices={viewRanges} choice={viewRange}
            setChoice={(value: number) => changeViewRange(value)} />
        </View>
      </View>
      <LineGraph
        data={simplifiedGraph} tooltipLabel={showWeight ? "lbs" : "reps"}
        height={400} getDate={getDate} getValue={getValue} update={update} />
    </View>
  );
}

function CardioPlot({ name, group }: { name: string; group: PlotGroup }) {
  const earliest = group.data[0].date;
  const latest = group.data[group.data.length - 1].date;

  const [year, setYear] = useState(latest.getFullYear());
  const [prevDisabled, setPrevDisabled] = useState(false);
  const [nextDisabled, setNextDisabled] = useState(false);
  const [showDistance, setShowDistance] = useState(true);

  const [startIndex, setStartIndex] = useState(group.data.length - 1);
  const [endIndex, setEndIndex] = useState(group.data.length - 1);

  const getDate = (v: PlotPoint) => v.date;
  const getValue = (v: PlotPoint) => showDistance ? v.distance : v.duration;

  const [update, setUpdate] = useState(true);
  const forceRerender = (ret: void) => setUpdate(!update);

  useEffect(() => {
    setPrevDisabled(year <= earliest.getFullYear());
    setNextDisabled(year >= latest.getFullYear());
  }, [year]);

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

    const rangeEnd = nextYear + 1 > latest.getFullYear() ? latest : new Date(nextYear + 1, 0, 1);
    const endDiff = monthDiff(rangeEnd, latest);
    setEndIndex(getMonthIndex(group.months, endDiff));

    forceRerender();
  }

  useEffect(() => changeYear(0), []);

  return (
    <View className="bg-white px-3 w-full mb-4">
      <View className="flex-row justify-between items-center">
        <Text className="text-xl">{name}</Text>

        <Selection
          choices={["Distance", "Duration"]}
          handleChoice={(index: number) => forceRerender(setShowDistance(index == 0))} />

        <View className="flex-row gap-2 items-center">
          <Pressable
            onPress={() => changeYear(-1)}
            disabled={prevDisabled}>
            <Feather name="arrow-left" size={18} color={prevDisabled ? "gray" : "black"} />
          </Pressable>
          <Text className="text-base"> {year} </Text>
          <Pressable
            onPress={() => changeYear(1)}
            disabled={nextDisabled}>
            <Feather name="arrow-right" size={18} color={nextDisabled ? "gray" : "black"} />
          </Pressable>
        </View>
      </View>
      <Heatmap
        data={group.data.slice(startIndex, endIndex + 1)}
        tooltipLabel={showDistance ? "km" : "min"}
        height={150} getDate={getDate} getValue={getValue} update={update} />
    </View>
  );
}

export default function ProgressPage() {
  const workoutsState = useSelector(state => state.workouts);

  // map the data into a set of plot points, and group by exercise
  let exercises: Record<string, PlotGroup> = {};
  for (const w of workoutsState.workouts) {
    if (w.is_template) continue;
    for (const e of w.exercises) {
      const point = {
        date: w.tag, weight: e.weight ?? 0,
        duration: e.duration ?? 0, distance: e.distance ?? 0,
        averageReps: e.reps.length ? e.reps.reduce((a, b) => a + b, 0) / e.reps.length : 0,
      };

      if (exercises[e.name] === undefined)
        exercises[e.name] = { exercise_type: e.exercise_type, data: [point], months: [] };
      else
        exercises[e.name].data.push(point);
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
      if (date.getMonth() != prev.getMonth())
        exercises[name].months.push({ elapsed: monthDiff(prev, date), index });
    }
  }

  return (
    <ScrollContainer>
      {Object.keys(exercises).length == 0 &&
        <Empty messages={["You have no workout templates"]} />}

      <FlatList
        data={Object.keys(exercises)}
        renderItem={({ item }) => {
          if (exercises[item].exercise_type == ExerciseType.Resistance)
            return <ResistancePlot group={exercises[item]} name={item} />;
          return <CardioPlot group={exercises[item]} name={item} />;
        }} />
    </ScrollContainer>
  );
}
