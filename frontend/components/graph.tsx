import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";

import { Text, View } from "react-native";
import { Line, Rect, Path, Svg, Text as SvgText } from "react-native-svg";

export interface PlotPoint {
  date: Date;
  weight: number;
  averageReps: number;
  distance: number;
  duration: number;
}

interface PlotProps {
  data: PlotPoint[];
  height: number;
  tooltipLabel: string;
  getValue: (v: PlotPoint) => number;
}

interface TooltipProps {
  data: PlotPoint[];
  tooltipX: number;
  minX: number;
  maxX: number;
  width: number;
  paddingX: number;
  tooltipLabel: string;
  getValue: (v: PlotPoint) => number;
}

function Tooltip({ data, tooltipX, minX, maxX, width,
  paddingX, tooltipLabel, getValue }: TooltipProps) {
  if (tooltipX == -1) return null;

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
        {formatDate(data[closestPoint].date)}
      </Text>
    </View>
  );
}


export function LineGraph({ data, height, getValue, tooltipLabel }: PlotProps) {
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
    if (data.length == 0) return;

    const minX = Math.min(...data.map((p: PlotPoint) => p.date.getTime()));
    const maxX = Math.max(...data.map((p: PlotPoint) => p.date.getTime()));

    const minY = Math.min(...data.map((p: PlotPoint) => getValue(p)));
    const maxY = Math.max(...data.map((p: PlotPoint) => getValue(p)));

    const pathStr = data.map((p: PlotPoint, i: number) => {
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
          const xValue = minX + i * ((maxX - minX) / numTicksX);
          const str = formatDate(new Date(xValue));
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

export function Heatmap({ data, height, getValue, tooltipLabel }: PlotProps) {
  const [width, setWidth] = useState(0);
  const [paddingX, paddingY, fontSize] = [25, 25, 12];

  // map dates (string) to indexes inside `data`
  const [dateMap, setDateMap] = useState<Record<string, number>>({});
  const [year, setYear] = useState(0);
  const [yearLength, setYearLength] = useState(0);
  const [minY, setMinY] = useState(0);
  const [maxY, setMaxY] = useState(0);

  const tileColor = (percentage: number) => {
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
    const year = data[0].date.getFullYear();
    setYearLength(((year % 4 === 0 && year % 100 > 0) || year % 400 == 0) ? 366 : 365);
    setYear(year);

    const minY = Math.min(...data.map((p: PlotPoint) => getValue(p)));
    const maxY = Math.max(...data.map((p: PlotPoint) => getValue(p)));
    setMinY(minY);
    setMaxY(maxY);

    setDateMap(_prev => {
      let m: Record<string, number> = {};
      for (let i = 0; i < data.length; i++)
        m[formatDate(data[i].date)] = i;
      return m;
    });
  }, [width, data, getValue]);

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Svg>
        {[...Array(yearLength).keys()].map((i) => {
          const tileSize = width / 52;
          const x = paddingX + (i % 52) * tileSize;
          const y = (height - paddingY) + (i % 7) * tileSize;

          const day = new Date(year, 0, i);
          const pointIndex = dateMap[formatDate(day)];

          let color = "transparent";
          if (pointIndex) {
            const percent = (getValue(data[pointIndex]) - minY) / (maxY - minY);
            color = tileColor(percent);
          }

          return (
            <Rect x={x} y={y} width={tileSize} height={tileSize} key={i} fill={color} />
          );
        })}
      </Svg>
    </View>
  );
}
