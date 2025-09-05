import { useEffect, useState } from "react";
import { formatDate, weekIndex } from "@/lib/utils";
import * as plot from "@/lib/plot";

import { Text, View } from "react-native";
import { Line, Rect, Path, Svg, Text as SvgText } from "react-native-svg";
import { Card } from "@/components/container";
import { Dropdown } from "@/components/elements";

interface PlotProps {
  data: plot.PlotPoint[];
  height: number;
  tooltipLabel: string;
  getValue: (v: plot.PlotPoint) => number;
}

interface TooltipProps {
  data: plot.PlotPoint[];
  tooltipX: number;
  minX: number;
  maxX: number;
  width: number;
  paddingX: number;
  tooltipLabel: string;
  getValue: (v: plot.PlotPoint) => number;
}

function Tooltip({ data, tooltipX, minX, maxX, width,
  paddingX, tooltipLabel, getValue }: TooltipProps) {
  if (tooltipX === -1) return null;

  // get the data point closest to the hovered point
  let xPercent = (tooltipX - paddingX * 2) / (width - paddingX * 2);
  xPercent = Math.min(Math.max(0, xPercent), 1);

  const xValue = Math.round(minX + xPercent * (maxX - minX));
  let closestPoint = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i].date.getTime() >= xValue) {
      closestPoint = i;
      break;
    }
  }

  const tooltipWidth = 100; // estimate
  const left = tooltipX >= width - tooltipWidth - paddingX
    ? width - tooltipWidth : tooltipX

  return (
    <View
      className="bg-primary-500 p-2 rounded-xl"
      style={{ position: "absolute", top: 0, left }}>
      <Text className="text-center text-[8px] text-surface-color">
        {getValue(data[closestPoint])} {tooltipLabel}
      </Text>
      <Text className="text-center text-[8px] text-surface-color">
        {formatDate(data[closestPoint].date, "short")}
      </Text>
    </View>
  );
}


function LineGraph({ data, height, getValue, tooltipLabel }: PlotProps) {
  const [paddingX, paddingY, fontSize] = [25, 25, 12];
  const [tickColor, lineColor, textColor] = ["#e8e8e8", "#046DF9", "#000000"];

  const [width, setWidth] = useState(0);
  const [numTicksX, numTicksY] = [3, 10];
  const [xSpacing, setXSpacing] = useState(0);
  const [ySpacing, setYSpacing] = useState(0);

  const [minX, setMinX] = useState(0);
  const [maxX, setMaxX] = useState(0);
  const [minY, setMinY] = useState(0);
  const [maxY, setMaxY] = useState(0);

  const [pathData, setPathData] = useState("");

  useEffect(() => {
    if (data.length === 0) return;

    const minX = Math.min(...data.map((p: p) => p.date.getTime()));
    const maxX = Math.max(...data.map((p: plot.PlotPoint) => p.date.getTime()));

    const minY = Math.min(...data.map((p: plot.PlotPoint) => getValue(p)));
    const maxY = Math.max(...data.map((p: plot.PlotPoint) => getValue(p)));

    const pathStr = data.map((p: plot.PlotPoint, i: number) => {
      const xPercent = (p.date.getTime() - minX) / (maxX - minX);
      const x = paddingX + (xPercent * (width - paddingX * 2));

      const yPercent = (getValue(p) - minY) / (maxY - minY);
      const y = height - paddingY - (yPercent * (height - paddingY * 2));

      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(" ");
    setPathData(pathStr);

    setXSpacing((width - paddingX * 2) / numTicksX);
    setYSpacing((height - paddingY * 2) / numTicksY);
    setMinX(minX);
    setMaxX(maxX);
    setMinY(minY);
    setMaxY(maxY);
  }, [width, data, getValue]);

  const [tooltipX, setTooltipX] = useState(-1);

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Svg width={width} height={height}>
        {[...Array(numTicksY + 1).keys()].map((i) => (
          <Line
            x1={paddingX} y1={height - paddingY - i * ySpacing}
            x2={width - paddingX} y2={height - paddingY - i * ySpacing}
            stroke={tickColor} strokeWidth="1" key={i} />
        ))}

        {[...Array(numTicksY + 1).keys()].map((i) => {
          const yValue = minY + i * ((maxY - minY) / numTicksY);
          return (
            <SvgText
              fill={textColor} fontWeight="normal" key={i}
              textAnchor="middle" fontSize={fontSize}
              x={paddingX / 2} y={height - paddingY - i * ySpacing + (fontSize / 3)}>
              {`${yValue.toFixed(1)}`}
            </SvgText>
          );
        })}

        {[...Array(numTicksX + 1).keys()].map((i) => {
          if (i == 0) return null;
          const xValue = minX + i * ((maxX - minX) / numTicksX);
          const str = formatDate(new Date(xValue), "short");
          return (
            <SvgText
              fill={textColor} fontWeight="normal" key={i}
              textAnchor="middle" fontSize={fontSize}
              x={paddingX + i * xSpacing} y={height - paddingY}>
              {str}
            </SvgText>
          );
        })}

        <Tooltip data={data} tooltipX={tooltipX} minX={minX}
          maxX={maxX} width={width} paddingX={paddingX}
          tooltipLabel={tooltipLabel} getValue={getValue} />

        <Path
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={() => { }}
          onResponderRelease={() => setTooltipX(-1)}
          onResponderMove={e => setTooltipX(e.nativeEvent.locationX)}
          onResponderStart={e => setTooltipX(e.nativeEvent.locationX)}
          d={pathData} stroke={lineColor} strokeWidth={2}
          fill="none" />
      </Svg>
    </View>
  );
}

interface TimeSeriesChartProps {
  name: string;
  data: plot.PlotPoint[];
  months: plot.MonthInterval[];
  tooltipLabel: string;
  toVec2: (p: plot.PlotPoint) => plot.Vec2;
  getValue: (p: plot.PlotPoint) => number;
  children: React.ReactNode;
}

export function TimeSeriesChart(
  { name, data, months, toVec2, getValue, tooltipLabel, children }: TimeSeriesChartProps) {
  const viewRanges = [
    { label: "This month", value: 1 },
    { label: "Last 6 months", value: 6 },
    { label: "This year", value: 12 },
    { label: "Last 5 years", value: 60 },
    {
      label: "All time",
      value: plot.monthDiff(data[0].date, data[data.length - 1].date),
    },
  ];
  const [viewRange, setViewRange] = useState(0);

  const [startIndex, setStartIndex] = useState(plot.getMonthIndex(months, 1));
  const [simplifiedGraph, setSimplifiedGraph] = useState([] as plot.PlotPoint[]);

  useEffect(() => {
    const targetPoints = 100;
    const points: plot.PlotPoint[] = data.slice(startIndex, data.length);
    plot.simplifyGraph(points, targetPoints, toVec2).then((simplified) => setSimplifiedGraph(simplified));
  }, [startIndex, data, toVec2]);

  const changeViewRange = (numMonths: number) => {
    // the dates are in ascending order (oldest, newest), so by changing the index at which
    // we slice the plot points, we change what the oldest plot point will be (change range)
    setStartIndex(plot.getMonthIndex(months, numMonths));
  };

  return (
    <Card>
      <View className="flex-column">
        <Text className="text-xl">{name}</Text>

        <View className="flex-column gap-2 flex-1">
          {children}
          <Dropdown
            options={viewRanges}
            current={viewRange}
            setCurrent={(index: number) => {
              setViewRange(index);
              changeViewRange(viewRanges[index].value);
            }}
            currentElement={
              <Text className="text-xs text-surface-color px-3">
                {viewRanges[viewRange].label}
              </Text>
            }
            optionElement={(index: number) =>
              <Text className="text-xs px-3">
                {viewRanges[index].label}
              </Text>
            }
          />
        </View>
      </View>

      <LineGraph
        data={simplifiedGraph}
        tooltipLabel={tooltipLabel}
        height={400} getValue={getValue} />
    </Card>
  );
}

export function Heatmap({ data, height, getValue, tooltipLabel }: PlotProps) {
  const [width, setWidth] = useState(0);
  const [paddingX, paddingY, fontSize] = [20, 20, 12];

  const tileWidth = (width - paddingX * 2) / 52;
  const tileHeight = (height - paddingY * 2) / 7;

  const shortenedMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const shortenedWeekdays = ["Mon", "Wed", "Fri"];

  // map dates (string) to indexes inside `data`
  const [minY, setMinY] = useState(0);
  const [maxY, setMaxY] = useState(0);

  const interpolateColor = (percentage: number) => {
    const min = [200, 100, 49];
    const max = [214, 97, 50];
    const color = [
      min[0] + percentage * (max[0] - min[0]),
      min[1] + percentage * (max[1] - min[1]),
      min[2] + percentage * (max[2] - min[2])
    ];
    return `hsl(${color[0]},${color[1]}%,${color[2]}%)`;
  }

  useEffect(() => {
    const minY = Math.min(...data.map((p: plot.PlotPoint) => getValue(p)));
    const maxY = Math.max(...data.map((p: plot.PlotPoint) => getValue(p)));
    setMinY(minY);
    setMaxY(maxY);
  }, [width, data, getValue]);

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Svg>
        {[...Array(53).keys()].map((i) => (
          <Line
            x1={paddingX + tileWidth * i}
            x2={paddingX + tileWidth * i}
            y1={paddingY} y2={height - paddingY}
            stroke="#dbdbdb" key={i} />
        ))}

        {[...Array(8).keys()].map((i) => (
          <Line
            x1={paddingX} x2={width - paddingX}
            y1={paddingY + tileHeight * i}
            y2={paddingY + tileHeight * i}
            stroke="#dbdbdb" key={i} />
        ))}

        {shortenedWeekdays.map((w, i) => (
          <SvgText
            fill="black" fontWeight="normal" key={i}
            textAnchor="middle" fontSize={fontSize}
            y={paddingY + ((i + 1) * (tileHeight * 2)) - (fontSize / 2)}
            x={(paddingX / 1.5)}> {w} </SvgText>
        ))}

        {shortenedMonths.map((m, i) => (
          <SvgText
            fill="black" fontWeight="normal" key={i}
            textAnchor="middle" fontSize={fontSize}
            x={paddingX + (i * (tileWidth * (52 / 12)) + (tileWidth * 2))}
            y={height - (fontSize / 2)}> {m} </SvgText>
        ))}

        {data.map((p, i) => {
          return <Rect
            key={i}
            x={paddingX + weekIndex(p.date) * tileWidth}
            y={paddingY + p.date.getDay() * tileHeight}
            width={tileWidth} height={tileHeight}
            fill={interpolateColor((getValue(p) - minY) / (maxY - minY))} />;
        })}
      </Svg>
    </View>
  );
}
