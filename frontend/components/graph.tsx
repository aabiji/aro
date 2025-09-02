import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";

import { GestureResponderEvent, View } from "react-native";
import { Line, Path, Svg, Text } from "react-native-svg";

function handleMouseMove(
  event, point, xScale, yScale, getDate, getValue,
  setDate, setValue, setTooltipStyle) {
  const coord = d3.pointer(event);
  if (point !== undefined) {
    setDate(formatDate(getDate(point)));
    setValue(getValue(point));

    event.target.setAttribute("stroke", "white");
    event.target.setAttribute("stroke-width", 2);
  } else {
    setDate(formatDate(xScale.invert(coord[0])));
    setValue(Math.round((yScale.invert(coord[1]) * 10) / 10).toFixed(1));
  }

  setTooltipStyle({
    display: "flex",
    flexDirection: "column",
    position: "absolute",
    left: Math.floor(coord[0]),
    top: Math.floor(coord[1]) + 10,
    backgroundColor: "grey",
    pointerEvents: "none", // avoid flickering
    padding: 6,
  });
}

function handleMouseLeave(event, setTooltipStyle) {
  setTooltipStyle({ display: "none" });
  event.target.setAttribute("stroke", "none");
}

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

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Svg width={width} height={height}>
        {[...Array(numTicksY + 1).keys()].map((i) => (
          <Line
            x1={paddingX} y1={height - paddingY - i * ySpacing}
            x2={width - paddingX} y2={height - paddingY - i * ySpacing}
            stroke={tickColor} strokeWidth="1" />
        ))}

        {[...Array(numTicksY + 1).keys()].map((i) => {
          const yValue = minY + i * ((maxY - minY) / numTicksY);
          return (
            <Text
              fill={textColor} fontWeight="normal"
              textAnchor="middle" fontSize={fontSize}
              x={paddingX / 2} y={height - paddingY - i * ySpacing + (fontSize / 3)}>
              {`${yValue.toFixed(1)}`}
            </Text>
          );
        })}

        {[...Array(numTicksX + 1).keys()].map((i) => {
          const xValue = minX + i * ((maxX - minX) / numTicksX);
          const str = formatDate(new Date(xValue));
          return (
            <Text
              fill={textColor} fontWeight="normal"
              textAnchor="middle" fontSize={fontSize}
              x={paddingX + i * xSpacing} y={height - paddingY}>
              {str}
            </Text>
          );
        })}

        <Path d={pathData} strokeWidth={15} fill="none" stroke="transparent" />
        <Path d={pathData} pointerEvents="none" stroke={lineColor} strokeWidth={2} fill="none" />
      </Svg>
    </View>
  );
}

export function Heatmap({ data, height, getValue, tooltipLabel }: PlotProps) {
  /*
  const windowSize = useWindowDimensions();

  const ref = useRef(null);
  const oldest = d3.min(data, getDate);
  const newest = d3.max(data, getDate);
  const weeks = d3.timeWeek.count(d3.timeWeek.floor(oldest), newest) + 1;
  const weekLength = 7;

  const [h, py] = [height, height / 6];

  const monthTicks = d3.timeMonth.every(1).range(oldest, newest);

  const [date, setDate] = useState("");
  const [value, setValue] = useState("");
  const [tooltipStyle, setTooltipStyle] = useState({ display: "none" });

  useEffect(() => {
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const svg = d3.select(ref.current);
    ref.current.innerHTML = ""; // clear

    const [width, px] = [ref.current.getBoundingClientRect().width, 25];
    const cellX = (width - px * 2) / weeks;
    const cellY = cellX * 1.5;

    const xScale = d3
      .scaleTime()
      .domain([oldest, newest])
      .range([px, px + weeks * cellX]);
    const xAxis = d3
      .axisBottom(xScale)
      .tickSize(0)
      .tickValues(monthTicks)
      .tickFormat(d3.timeFormat("%b"));
    svg
      .append("g")
      .attr("transform", `translate(0, ${h - py})`)
      .call(xAxis);

    const yScale = d3
      .scaleBand()
      .domain(d3.range(weekLength))
      .range([h - py, h - py - weekLength * cellY]);
    const yAxis = d3
      .axisLeft(yScale)
      .tickSize(0)
      .tickValues([1, 3, 5]) // monday, wednesday, friday
      .tickFormat((d) => weekDays[d]);
    svg.append("g").attr("transform", `translate(${px}, 0)`).call(yAxis);

    const colorScale = d3
      .scaleLinear()
      .domain(d3.extent(data, getValue))
      .range(["#c0ecfc", "#00b9fc"]);

    svg
      .selectAll("rect")
      .data(data)
      .join("rect")
      .attr(
        "x",
        (d) => px + d3.timeWeek.count(d3.timeWeek.floor(oldest), getDate(d)) * cellX,
      )
      .attr("width", cellX)
      .attr("y", (d) => yScale(getDate(d).getDay()))
      .attr("height", cellY)
      .attr("fill", (d) => colorScale(getValue(d)))
      .attr("cursor", "pointer")
      .on("mousemove", (event: MouseEvent, d) =>
        handleMouseMove(
          event, d, undefined, undefined, getDate,
          getValue, setDate, setValue, setTooltipStyle),
      )
      .on("mouseleave", (event: MouseEvent) => handleMouseLeave(event, setTooltipStyle));
  }, [windowSize, update, h, value, getDate, data, py, getValue, newest, oldest, monthTicks, weeks]);

  return (
    <View>
      <View style={tooltipStyle}>
        <Text className="text-default-background font-bold text-center">
          {value} {tooltipLabel} - {date}
        </Text>
      </View>
      <svg ref={ref} width="100%" height={h} />
    </View>
  );
  */
  return (
    <View>
      <Svg>

      </Svg>
    </View>
  );
}
