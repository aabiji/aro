import { useEffect, useState } from "react";
import { useStore, TagInfo } from "@/lib/state";
import { formatDate } from "@/lib/utils";

import { Pressable, Text, View } from "react-native";
import { Container, Card } from "@/components/container";
import { Tag, TagManager } from "@/components/tag";

import Ionicons from "@expo/vector-icons/Ionicons";

interface CalendarTileProps {
  date?: Date;
  disabled?: boolean;
  toggle?: () => void;
}

function CalendarTile({ date, disabled, toggle }: CalendarTileProps) {
  const store = useStore();
  const tagIds = store.taggedDates[formatDate(date!)] ?? [];
  const colors = tagIds.map((id: number) => store.tags[id].color);
  const empty = date === undefined || toggle === undefined;

  return (
    <Pressable
      onPress={toggle} disabled={disabled || empty}
      className="w-[14%] aspect-square bg-default-background border-l-[1px] border-gray-400 border-t-[1px]">
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
  const store = useStore();

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
    store.toggleTaggedDate(formatDate(date), selectedTag);
  };

  return (
    <Container syncState>
      <TagManager visible={modalVisible} close={() => setModalVisible(false)} />

      <Card className="mb-0 pb-2 border-b border-neutral-200">
        <View className="flex-row justify-between items-center mb-4">
          <Pressable onPress={() => changeMonth(-1)}>
            <Ionicons name="arrow-back" size={26} color="black" />
          </Pressable>

          <Text className="text-xl">
            {formatDate(date, true)}, {date.getFullYear()}
          </Text>

          <Pressable onPress={() => changeMonth(1)}>
            <Ionicons name="arrow-forward" size={26} color="black" />
          </Pressable>
        </View>

        <View
          className="border-r-2 border-b-2 border-l-[1px] border-t-[1px] border-neutral-400 flex-wrap flex-row">
          {[...Array(numTiles).keys()].map((i) => {
            const index = i - startWeekday;
            const d = new Date(date.getFullYear(), date.getMonth(), index + 1);
            const empty = index < 0 || index >= monthLength;
            return (
              <CalendarTile
                date={empty ? undefined : d} key={i}
                disabled={empty || selectedTag == -1}
                toggle={() => tagDay(d)} />
            );
          })}
        </View>
      </Card>

      <Card className="flex-row items-center flex-wrap h-max-[100px]">
        {Object.values(store.tags).map((tag: TagInfo, index: number) => (
          <Tag
            key={index} tag={tag} selected={selectedTag === tag.id}
            setSelected={() => setSelectedTag(selectedTag === tag.id ? -1 : tag.id)} />
        ))}

        <Pressable onPress={() => setModalVisible(true)} className="ml-2">
          <Ionicons name="cog" color="black" size={25} />
        </Pressable>
      </Card>
    </Container>
  );
}
