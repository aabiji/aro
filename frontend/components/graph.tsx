import { useRef, useEffect, useState } from "react";
import { useWindowDimensions, Text, View } from "react-native";
import * as d3 from "d3";

function handleMouseLeave(setTooltipStyle) { setTooltipStyle({ display: "none" }); }

function handleMouseMove(
  event, xScale, yScale, isHeatmap,
  setDate, setValue, setTooltipStyle) {
  const yValue = (y: number) => {
    if (!isHeatmap) return yScale.invert(coord[1]);
    console.log(yScale.range());
  };

  const coord = d3.pointer(event);
  const date = xScale.invert(coord[0]).toString();
  const value = ((Math.round(yValue(coord[1])) * 10) / 10).toFixed(1);

  setDate(date);
  setValue(value);
  setTooltipStyle({
    display: "flex",
    flexDirection: "column",
    position: "absolute",
    left: Math.floor(coord[0]),
    top: Math.floor(coord[1]),
    backgroundColor: "grey",
    padding: 6,
    cursor: "pointer",
    pointerEvents: "none", // avoid flickering
  });
}

export function LineGraph({ data, height, getDate, getValue, update, label }) {
  const windowSize = useWindowDimensions();

  const ref = useRef(null);
  const [h, py] = [height, height / 10];

  const [date, setDate] = useState("");
  const [value, setValue] = useState("");
  const [tooltipStyle, setTooltipStyle] = useState({ display: "none" });

  useEffect(() => {
    const svg = d3.select(ref.current);
    ref.current.innerHTML = ""; // clear

    const [w, px] = [ref.current.getBoundingClientRect().width, 25];
    const xScale = d3.scaleTime()
      .domain(d3.extent(data, getDate))
      .range([px, w - px]);
    const xAxis = d3.axisBottom(xScale)
      .ticks(5)
      .tickFormat(d3.utcFormat("%B %d, %Y"));
    svg.append("g")
      .attr("transform", `translate(0, ${h - py})`)
      .call(xAxis);

    const yScale = d3.scaleLinear()
      .domain(d3.extent(data, getValue))
      .range([h - py, py]);
    svg.append("g")
      .attr("transform", `translate(${px}, 0)`)
      .call(d3.axisLeft(yScale));

    const line = d3.line()
      .x(d => xScale(getDate(d)))
      .y(d => yScale(getValue(d)))
      .curve(d3.curveLinear);

    svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 2)
      .attr("d", line);

    svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "transparent")
      .attr("stroke-width", 35)
      .attr("pointer-events", "stroke") // hover only on the stroke, not fill
      .attr("d", line)
      .on("mousemove", (event: MouseEvent) =>
        handleMouseMove(event, xScale, yScale, false, setDate, setValue, setTooltipStyle))
      .on("mouseleave", () => handleMouseLeave(setTooltipStyle));
  }, [windowSize, update]);

  return (
    <View>
      <View style={tooltipStyle}>
        <Text className="text-white font-bold text-center">{value} {label} - {date}</Text>
      </View>
      <svg ref={ref} width="100%" height={h} />
    </View>
  );
}

export function Heatmap({ data, height, getDate, getValue, update }) {
  const windowSize = useWindowDimensions();

  const ref = useRef(null);
  const oldest = d3.min(data, getDate);
  const newest = d3.max(data, getDate);
  const weeks = d3.timeWeek.count(d3.timeWeek.floor(oldest), newest) + 1;
  const weekLength = 7;

  const [h, py] = [height, height / 6];

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthTicks = d3.timeMonth.every(1).range(oldest, newest);

  const [date, setDate] = useState("");
  const [value, setValue] = useState("");
  const [tooltipStyle, setTooltipStyle] = useState({ display: "none" });

  useEffect(() => {
    const svg = d3.select(ref.current);
    ref.current.innerHTML = ""; // clear

    const [width, px] = [ref.current.getBoundingClientRect().width, 25];
    const cellX = (width - (px * 2)) / weeks;
    const cellY = cellX * 1.5;

    const xScale = d3.scaleTime()
      .domain([oldest, newest])
      .range([px, px + weeks * cellX]);
    const xAxis = d3.axisBottom(xScale)
      .tickSize(0)
      .tickValues(monthTicks)
      .tickFormat(d3.timeFormat("%b"));
    svg.append("g")
      .attr("transform", `translate(0, ${h - py})`)
      .call(xAxis);

    const yScale = d3.scaleBand()
      .domain(d3.range(weekLength))
      .range([h - py, (h - py) - weekLength * cellY]);
    const yAxis = d3.axisLeft(yScale)
      .tickSize(0)
      .tickValues([1, 3, 5]) // monday, wednesday, friday
      .tickFormat(d => weekDays[d]);
    svg.append("g")
      .attr("transform", `translate(${px}, 0)`)
      .call(yAxis);

    const colorScale = d3.scaleLinear()
      .domain(d3.extent(data, getValue))
      .range(["#c0ecfc", "#00b9fc"]);

    svg.selectAll("rect")
      .data(data)
      .join("rect")
      .attr("x", d => px + d3.timeWeek.count(d3.timeWeek.floor(oldest), getDate(d)) * cellX)
      .attr("width", cellX)
      .attr("y", d => yScale(getDate(d).getDay()))
      .attr("height", cellY)
      .attr("fill", d => colorScale(getValue(d)))
      .on("mousemove", (event: MouseEvent) =>
        handleMouseMove(event, xScale, yScale, true, setDate, setValue, setTooltipStyle))
      .on("mouseleave", () => handleMouseLeave(setTooltipStyle));
  }, [windowSize, update]);

  return (
    <View>
      <View style={tooltipStyle}>
        <Text className="text-white font-bold text-center">{value}</Text>
        <Text className="text-white text-center">{date}</Text>
      </View>
      <svg ref={ref} width="100%" height={h} />
    </View>
  );
}
