import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { tagActions, TagInfo } from "@/lib/state";
import { formatDate } from "@/lib/utils";

import { Pressable, Text, View } from "react-native";
import { ScrollContainer } from "@/components/container";
import { Tag, TagManager } from "@/components/tag";

import Feather from "@expo/vector-icons/Feather";

interface CalendarTileProps {
  date?: Date;
  disabled?: boolean;
  toggle?: () => void;
}

function CalendarTile({ date, disabled, toggle }: CalendarTileProps) {
  const tagData = useSelector((state) => state.tagData);
  const tagIds = tagData.taggedDates[formatDate(date!)] ?? [];
  const colors = tagIds.map(
    (id: number) => tagData.tags.find((tag: TagInfo) => tag.id == id).color,
  );
  const empty = date === undefined || toggle === undefined;

  return (
    <Pressable
      onPress={toggle}
      disabled={disabled || empty}
      className="w-full p-[5px] aspect-square bg-gray-100"
    >
      {!empty && (
        <View className="flex-column h-full gap-[3px]">
          {colors.map((c: string, index: number) => (
            <View key={index} style={{ flex: 1, backgroundColor: c, opacity: 0.5 }} />
          ))}
          <Text className="absolute right-[10px] top-[10px]">{date.getDate()}</Text>
        </View>
      )}
    </Pressable>
  );
}

export default function TagsPage() {
  const dispatch = useDispatch();
  const tagData = useSelector((state) => state.tagData);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTag, setSelectedTag] = useState(-1);

  const [date, setDate] = useState(new Date());
  const [monthLength, setMonthLength] = useState(0);
  const [startWeekday, setStartWeekday] = useState(0);
  const [numTiles, setNumTiles] = useState(0);

  useEffect(() => {
    const length = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const start = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    const total = Math.ceil((start + length) / 7) * 7; // round it to the nearest multiple of 7
    setMonthLength(length);
    setStartWeekday(start);
    setNumTiles(total);
  }, [date]);

  const changeMonth = (delta: number) => {
    setDate((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + delta);
      return next;
    });
  };

  // add/remove tag to a calendar date
  const tagDay = (date: Date) => {
    if (selectedTag == -1) return;
    dispatch(
      tagActions.toggleDate({
        date: formatDate(date),
        value: tagData.tags[selectedTag].id,
      }),
    );
  };

  return (
    <ScrollContainer>
      <View className="flex-row justify-between">
        <Text className="text-xl">Tag dates</Text>
        <Pressable onPress={() => setModalVisible(true)}>
          <Feather name="command" color="black" size={18} />
        </Pressable>
      </View>

      <View className="mb-2 border-b border-gray-200 flex-row items-center flex-wrap h-max-[100px]">
        {tagData.tags.map((tag: TagInfo, index: number) => (
          <Tag key={index} tag={tag} selected={selectedTag == index}
            setSelected={() => setSelectedTag(selectedTag == index ? -1 : index)} />
        ))}
      </View>

      <TagManager visible={modalVisible} close={() => setModalVisible(false)} />

      <View>
        <View className="flex-row justify-between items-center mb-4">
          <Pressable onPress={() => changeMonth(-1)}>
            <Feather name="arrow-left" size={26} color="black" />
          </Pressable>

          <Text className="text-xl">
            {formatDate(date, true)}, {date.getFullYear()}
          </Text>

          <Pressable onPress={() => changeMonth(1)}>
            <Feather name="arrow-right" size={26} color="black" />
          </Pressable>
        </View>

        <View className="grid grid-cols-7 bg-gray-400 gap-[1px] border-gray-400 border-2">
          {[...Array(numTiles).keys()].map((i) => {
            const index = i - startWeekday;
            const d = new Date(date.getFullYear(), date.getMonth(), index + 1);
            const empty = index < 0 || index >= monthLength;
            return (
              <CalendarTile
                date={empty ? undefined : d}
                key={i}
                disabled={empty || selectedTag == -1}
                toggle={() => tagDay(d)}
              />
            );
          })}
        </View>
      </View>
    </ScrollContainer>
  );
}
