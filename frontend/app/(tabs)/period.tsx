import { useEffect, useState } from "react";
import { useStore } from "@/lib/state";
import { formatDate, request } from "@/lib/utils";

import { Pressable, Text, View } from "react-native";
import { Container, Card } from "@/components/container";
import { Button } from "@/components/elements";

export default function PeriodPage() {
  const store = useStore();

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

  const toggleDate = async (dateStr: string) => {
    try {
      store.togglePeriodDate(dateStr);
      const params = new URLSearchParams();
      params.append("date", dateStr);
      await request("POST", `/auth/period?${params.toString()}`, undefined, store.jwt);
    } catch (err: any) {
      console.log("ERROR!", err);
    }
  }

  return (
    <Container syncState>
      <Card className="mb-0">
        <Text className="text-center text-xl">Mark period days</Text>

        <View className="flex-row justify-between items-center mb-2">
          <Button onPress={() => changeMonth(-1)} icon="arrow-back" transparent iconColor="black" iconSize={20} />
          <Text className="text-base"> {formatDate(date, "long")}, {date.getFullYear()} </Text>
          <Button onPress={() => changeMonth(1)} icon="arrow-forward" transparent iconColor="black" iconSize={20} />
        </View>

        <View
          className="rounded-xl border-2 border-neutral-400 flex-wrap flex-row">
          {[...Array(numTiles).keys()].map((i) => {
            const index = i - startWeekday;
            const d = new Date(date.getFullYear(), date.getMonth(), index + 1);
            const empty = index < 0 || index >= monthLength;
            const style =
              `w-[14%] aspect-square bg-surface-color
              ${i % 7 !== 0 ? "border-l-[1px]" : ""}
              ${i >= 7 ? "border-t-[1px]" : ""} border-grey-400`;
            const str = formatDate(d, "long");

            return (
              <Pressable onPress={() => toggleDate(str)} className={style} key={i}>
                {!empty && (
                  <View className="flex-1">
                    {store.periodDates[str] &&
                      <View style={{ flex: 1, backgroundColor: "red", opacity: 0.5 }} />}
                    <Text className="absolute right-[10px] top-[10px]">{d.getDate()}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </Card>
    </Container>
  );
}
