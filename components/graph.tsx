import { useRef, useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import * as d3 from "d3";

export function LineGraph({ data, height }) {
  const ref = useRef();
  const [h, py] = [height, height / 10];

  useEffect(() => {
    const svg = d3.select(ref.current);
    const w = ref.current.getBoundingClientRect().width;
    const px = w / 10;

    const xScale = d3.scaleTime()
      .domain(d3.extent(data, d => d.date))
      .range([px, w - px]);
    const xAxis = d3.axisBottom(xScale)
      .ticks(5)
      .tickFormat(d3.utcFormat("%B %d, %Y"));
    svg.append("g")
      .attr("transform", `translate(0, ${h - py})`)
      .call(xAxis);

    const yScale = d3.scaleLinear()
      .domain(d3.extent(data, d => d.value))
      .range([h - py, py]);
    svg.append("g")
      .attr("transform", `translate(${px}, 0)`)
      .call(d3.axisLeft(yScale));

    const line = d3.line()
      .x(d => xScale(d.date))
      .y(d => yScale(d.value))
      .curve(d3.curveLinear);
    svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 2)
      .attr("d", line);
    svg.selectAll("circle")
      .data(data)
      .join("circle")
      .attr("cx", d => xScale(d.date))
      .attr("cy", d => yScale(d.value))
      .attr("r", 2)
      .attr("fill", "steelblue");
  }, []);

  const [selected, unselected] =
    ["bg-blue-500 text-white p-1", "bg-transparent p-1"];

  return (
    <View>
      <View className="flex-row justify-between items-center">
        <Text className="text-xl"> Exercise name </Text>
        <View className="flex-row gap-2 bg-white rounded">
          <Pressable className={selected}> Weight </Pressable>
          <Pressable className={unselected}> Reps </Pressable>
        </View>
      </View>
      <svg ref={ref} width="100%" height={h} />
    </View>
  );
}

export function Heatmap({ data, height }) {
  const ref = useRef();
  const oldest = d3.min(data, d => d.date);
  const newest = d3.max(data, d => d.date);
  const weeks = d3.timeWeek.count(d3.timeWeek.floor(oldest), newest) + 1;
  const weekLength = 7;

  const [h, py] = [height, height / 6];

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthTicks = d3.timeMonth.every(1).range(oldest, newest);

  useEffect(() => {
    const svg = d3.select(ref.current);
    const width = ref.current.getBoundingClientRect().width;
    const px = width / 25;
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
      .domain(d3.extent(data, d => d.value))
      .range(["#c0ecfc", "#00b9fc"]);

    svg.selectAll("rect")
      .data(data)
      .join("rect")
      .attr("x", d => px + d3.timeWeek.count(d3.timeWeek.floor(oldest), d.date) * cellX)
      .attr("width", cellX)
      .attr("y", d => yScale(d.date.getDay()))
      .attr("height", cellY)
      .attr("fill", d => colorScale(d.value));
  }, []);

  return (
    <View>
      <View className="flex-row justify-between items-center">
        <Text className="text-xl"> Exercise name </Text>
        <View className="flex-row gap-2 items-center">
          <Pressable>
            <Feather name="arrow-left" color="black" size={18} />
          </Pressable>
          <Text> Year </Text>
          <Pressable>
            <Feather name="arrow-right" color="black" size={18} />
          </Pressable>
        </View>
      </View>

      <svg ref={ref} width="100%" height={h} />
    </View>
  );
}
