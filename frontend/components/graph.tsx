import { useRef, useEffect } from "react";
import { useWindowDimensions } from "react-native";
import * as d3 from "d3";

export function LineGraph({ data, height, getDate, getValue, update }) {
  const windowSize = useWindowDimensions();

  const ref = useRef(null);
  const [h, py] = [height, height / 10];

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
    svg.selectAll("circle")
      .data(data)
      .join("circle")
      .attr("cx", d => xScale(getDate(d)))
      .attr("cy", d => yScale(getValue(d)))
      .attr("r", 2)
      .attr("fill", "steelblue");
  }, [windowSize, update]);

  return <svg ref={ref} width="100%" height={h} />;
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
      .attr("fill", d => colorScale(getValue(d)));
  }, [windowSize, update]);

  return <svg ref={ref} width="100%" height={h} />;
}
