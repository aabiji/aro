import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

import { FlatList, Pressable, Text, View } from "react-native";
import { LineGraph, Heatmap } from "@/components/graph";
import { Empty, ScrollContainer } from "@/components/container";
import { Dropdown, Selection } from "@/components/select";
import Feather from "@expo/vector-icons/Feather";
import { ExerciseType } from "@/lib/state";

interface Vec2 { x: number; y: number };

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

interface PlotPoint {
  date: string;
  weight: number;
  averageReps: number;
  distance: number;
  duration: number;
}

interface PlotGroup {
  exercise_type: ExerciseType,
  data: PlotPoint[]
}

function ResistancePlot({ name, data }: { name: string; data: PlotPoint[] }) {
  const earliest = new Date(Math.min(...data.map(d => d.date)));
  const latest = new Date(Math.max(...data.map(d => d.date)));
  const monthDiff =
    latest.getMonth() - earliest.getMonth() + 12 * (latest.getFullYear() - earliest.getFullYear());

  const viewRanges = [
    { label: "This month", value: 1 },
    { label: "Last 6 months", value: 6 },
    { label: "This year", value: 12 },
    { label: "Last 5 years", value: 60, },
    { label: "All time", value: monthDiff }
  ];
  const [viewRange, setViewRange] = useState(viewRanges[0]);
  const [showWeight, setShowWeight] = useState(true);

  const getDate = (v: PlotPoint) => new Date(v.date);
  const getValue = (v: PlotPoint) => showWeight ? v.weight : v.averageReps;

  return (
    <View className="bg-white p-3 w-full mb-4">
      <View className="items-center flex-row justify-between items-center">
        <Text className="text-xl">{name}</Text>

        <View className="flex-column w-[25%]">
          <Selection
            choices={["Weight", "Reps"]}
            handleChoice={(index: number) => setShowWeight(index == 0)} />
          <Dropdown
            choices={viewRanges}
            choice={viewRange} setChoice={setViewRange} />
        </View>
      </View>
      <LineGraph data={data} height={400} getDate={getDate} getValue={getValue} />
    </View>
  );
}

function CardioPlot({ name, data }: { name: string; data: PlotPoint[] }) {
  const earliest = new Date(Math.min(...data.map(d => d.date)));
  const latest = new Date(Math.max(...data.map(d => d.date)));

  const [year, setYear] = useState(new Date().getFullYear());
  const [prevDisabled, setPrevDisabled] = useState(false);
  const [nextDisabled, setNextDisabled] = useState(false);
  useEffect(() => {
    setPrevDisabled(year <= earliest.getFullYear());
    setNextDisabled(year >= latest.getFullYear());
  }, [year]);

  const [showDistance, setShowDistance] = useState(true);

  const getDate = (v: PlotPoint) => new Date(v.date);
  const getValue = (v: PlotPoint) => showDistance ? v.distance : v.duration;

  return (
    <View className="bg-white p-3 w-full mb-4">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-xl">{name}</Text>

        <Selection
          choices={["Distance", "Duration"]}
          handleChoice={(index: number) => setShowDistance(index == 0)} />

        <View className="flex-row gap-2 items-center">
          <Pressable onPress={() => setYear(year - 1)} disabled={prevDisabled}>
            <Feather name="arrow-left" size={18} color={prevDisabled ? "gray" : "black"} />
          </Pressable>
          <Text className="text-base"> {year} </Text>
          <Pressable onPress={() => setYear(year + 1)} disabled={nextDisabled}>
            <Feather name="arrow-right" size={18} color={nextDisabled ? "gray" : "black"} />
          </Pressable>
        </View>
      </View>
      <Heatmap data={data} height={150} getDate={getDate} getValue={getValue} />
    </View>
  );
}

export default function ProgressPage() {
  const workoutsState = useSelector(state => state.workouts);

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
        exercises[e.name] = { exercise_type: e.exercise_type, data: [point] };
      else
        exercises[e.name].data.push(point);
    }
  }

  // TODO: where to fit this in?? how to find epsilon??
  //const epsilon = 1; // bigger epsilon = more simplification
  //for (const name in exercises) {
  //  const toVec2 = (v: PlotPoint) => ({ x: new Date(v.date).getTime(), y: v.value });
  //  exercises[name].data = ramerDouglasPeuker(exercises[name].data, epsilon, toVec2);
  //}

  // TODO: how to test with dummy values???
  //const now = new Date();
  //const lastYear = new Date(new Date().setFullYear(new Date().getFullYear() - 1));
  //let rawData = [];
  //for (let d = new Date(lastYear); d <= now; d.setDate(d.getDate() + 1)) {
  //  rawData.push({ date: new Date(d), value: Math.floor(Math.random() * 100) });
  //}

  return (
    <ScrollContainer>
      {Object.keys(exercises).length == 0 &&
        <Empty messages={["You have no workout templates"]} />}

      <FlatList
        data={Object.keys(exercises)}
        renderItem={({ item }) => {
          if (exercises[item].exercise_type == ExerciseType.Resistance)
            return <ResistancePlot data={exercises[item].data} name={item} />;
          return <CardioPlot data={exercises[item].data} name={item} />;
        }} />
    </ScrollContainer>
  );
}
