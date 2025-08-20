import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { eventsActions } from "@/lib/state";
import { request } from "@/lib/utils";

import { Pressable, Text, View } from "react-native";
import { ScrollContainer } from "@/components/container";
import ColorPicker, { Panel3 } from "reanimated-color-picker";

import Feather from "@expo/vector-icons/Feather";

function Tag({ name, removeTag }) {
  const [selected, setSelected] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [color, setColor] = useState("#ffffff");
  const style = `
    p-2 border-2 rounded-xl w-fit h-fit flex-row items-center cursor-pointer
    ${selected ? "border-gray-400" : "border-gray-200"}
  `;
  const pickerContainer = `
    rounded-xl bg-white p-2 w-[150px] h-[150px]
    rounded absolute z-1 border-2 border-gray-200
  `;
  const select = () => { if (!showPicker) setSelected(!selected); }

  return (
    <Pressable onPress={select} className={style}>
      <View className="relative h-fit flex-row gap-2 items-center">
        <Pressable
          onPress={() => setShowPicker(!showPicker)}
          style={{ backgroundColor: color }}
          className="w-[25px] h-[25px] rounded-full"></Pressable>
        <Text className={`ml-2 ${selected ? "font-bold" : ""}`}>{name}</Text>
        <Pressable onPress={removeTag}>
          <Feather name="x" color="black" size={14} />
        </Pressable>
      </View>

      {showPicker &&
        <View
          className={pickerContainer}>
          <ColorPicker
            style={{ width: "100%", height: "100%" }}
            onComplete={(color) => {
              setColor(color.hex);
              setShowPicker(false);
            }}>
            <Panel3 thumbSize={15} />
          </ColorPicker>
        </View>}
    </Pressable>
  );
}

export default function EventsPage() {
  const dispatch = useDispatch();
  const events = useSelector(state => state.events);

  const [date, setDate] = useState(new Date());
  const [calendarTiles, setCalendarTiles] = useState([]);

  // udpate the calendar tiles
  useEffect(() => {
    const length = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const startDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();

    // mark days in the calendar grid (there's a max of 7 rows)
    let tiles = [];
    for (let i = 0; i < 42; i++) {
      const day = i - startDay;
      tiles.push(i < startDay || day >= length ? undefined : day);
    }

    // remove completely empty week rows
    while (true) {
      if (!tiles.slice(-7).every(v => v === undefined))
        break;
      tiles = tiles.slice(0, tiles.length - 7);
    }

    setCalendarTiles(tiles);
  }, [date]);

  const months = [
    "January", "Febuary", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  const changeMonth = (delta: number) => {
    let copy = new Date(date);
    copy.setMonth(copy.getMonth() + delta);
    setDate(copy);
  }

  return (
    <ScrollContainer>
      <View>
        <Text className="text-xl font-bold">Your tags</Text>
        <Tag name="example tag" removeTag={() => console.log("removed!")} />
      </View>

      <View className="mt-2 mb-2 border-b-2 border-gray-200"></View>

      <View>
        <View className="flex-row justify-between items-center mb-4">
          <Pressable onPress={() => changeMonth(-1)}>
            <Feather name="arrow-left" size={26} color="black" />
          </Pressable>
          <Text className="text-xl">{months[date.getMonth()]}, {date.getFullYear()}</Text>
          <Pressable onPress={() => changeMonth(1)}>
            <Feather name="arrow-right" size={26} color="black" />
          </Pressable>
        </View>

        <View
          className="flex-row flex-wrap border-l border-t border-gray-400">
          {calendarTiles.map((day, index) => (
            <View key={index}
              className="w-[14.27%] aspect-square p-3 border-r border-b border-gray-400">
              {day !== undefined &&
                <Text className="text-right">{day + 1}</Text>}
            </View>
          ))}
        </View>
      </View>

    </ScrollContainer >
  );
}
