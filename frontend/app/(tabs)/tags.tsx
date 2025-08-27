import { useEffect, useState } from "react";
import { useStore, TagInfo } from "@/lib/state";
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
  const { tags, taggedDates } = useStore();
  const tagIds = taggedDates[formatDate(date!)] ?? [];
  const colors = tagIds.map((id: number) => tags[id].color);
  const empty = date === undefined || toggle === undefined;

  return (
    <Pressable
      onPress={toggle}
      disabled={disabled || empty}
      className="w-full p-[5px] aspect-square bg-default-background"
    >
      {!empty && (
        <View className="flex-column h-full gap-[3px]">
          {colors.map((c: string, index: number) => (
            <View
              key={index}
              style={{ flex: 1, backgroundColor: c, opacity: 0.5 }}
            />
          ))}
          <Text className="absolute right-[10px] top-[10px]">
            {date.getDate()}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export default function TagsPage() {
  const { tags, toggleTaggedDate } = useStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTag, setSelectedTag] = useState(-1);

  const [date, setDate] = useState(new Date());
  const [monthLength, setMonthLength] = useState(0);
  const [startWeekday, setStartWeekday] = useState(0);
  const [numTiles, setNumTiles] = useState(0);

  useEffect(() => {
    const length = new Date(
      date.getFullYear(),
      date.getMonth() + 1,
      0,
    ).getDate();
    const start = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    const total = Math.ceil((start + length) / 7) * 7; // round it to the nearest multiple of 7
    setMonthLength(length);
    setStartWeekday(start);
    setNumTiles(total);
  }, [date]);

  // TODO: how to lazily fetch tagged dates that we didn't initially get
  // (either in the past or in the future)
  // we initially got the first 10 most recent tags,
  // but now what ...
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
    toggleTaggedDate(formatDate(date), selectedTag);
  };

  return (
    <ScrollContainer syncState>
      <View className="flex-row mb-[-15px] justify-between w-[50%] m-auto">
        <Text className="text-xl">Tag dates</Text>
        <Pressable onPress={() => setModalVisible(true)}>
          <Feather name="command" color="black" size={18} />
        </Pressable>
      </View>

      <View className="w-[50%] m-auto mb-2 border-b border-neutral-200 flex-row items-center flex-wrap h-max-[100px] pb-5">
        {Object.values(tags).map((tag: TagInfo, index: number) => (
          <Tag
            key={index}
            tag={tag}
            selected={selectedTag == tag.id}
            setSelected={() =>
              setSelectedTag(selectedTag == tag.id ? -1 : tag.id)
            }
          />
        ))}
      </View>

      <TagManager visible={modalVisible} close={() => setModalVisible(false)} />

      <View className="w-[50%] m-auto">
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

        <View className="grid grid-cols-7 bg-neutral-400 gap-[1px] border-neutral-400 border-2 h-[70%]">
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
