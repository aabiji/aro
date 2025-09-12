import { useState } from "react";
import { router } from "expo-router";
import { useStore } from "@/lib/state";
import { formatDate, request } from "@/lib/utils";

import { Text, View } from "react-native";
import { Button, Container } from "@/components/elements";
import { Meal } from "@/components/meal";

export default function FoodPage() {
  const store = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());

  const addMeal = async () => {
    console.log("adding...");
    router.push("/food/search");
  }

  const changeDay = async (next: boolean) => {
    setCurrentDate(prev => {
      let date = new Date(prev.getTime());
      date.setDate(date.getDate() + (next ? 1 : -1));
      return date;
    });
    const day = formatDate(currentDate, "long");

    // for example when creating a log for some future date
    if (store.dailyMeals[day] === undefined) {
      try {
        const params = new URLSearchParams();
        params.append("date", day);

        const json =
          await request("POST", `/auth/meal/date?${params.toString()}`, undefined, store.jwt);
        store.createDailyMeals(day, json.ids);
      } catch (err: any) {
        console.log("ERROR!", err);
      }
    }
  }

  return (
    <Container>
      <View className="flex-row justify-between items-center px-3">
        <Text>{formatDate(new Date(), "long")}</Text>

        {/*make prev/next buttons work, open food search page on click */}
        <View className="flex-row items-center gap-2">
          <Button
            icon="chevron-back" iconSize={24}
            iconColor="#808080" transparent
            onPress={() => changeDay(false)} />
          <Button icon="add" iconSize={26} iconColor="white" onPress={addMeal} />
          <Button
            icon="chevron-forward" iconSize={24}
            iconColor="#808080" transparent
            onPress={() => changeDay(true)} />
        </View>
      </View>

      {/*store.macroTargets.map((t, i) => {
        const percent = t.value / t.target * 100;
        const hue = Math.round(120 - (t.value / t.target * 120)); // green (120) to red (0)
        return (
          <Card key={i} className="relative flex-row justify-between">
            <Text>{t.name}</Text>
            <Text>{t.value} / {t.target}</Text>
            <View
              style={{
                position: "absolute", borderRadius: 15,
                bottom: 0, left: 0, height: 3,
                backgroundColor: `hsl(${hue}, 100%, 50%)`,
                width: `${percent}%`,
              }}>
            </View>
          </Card>
        );
      })*/}

      {store.dailyMeals[formatDate(currentDate, "long")].map((id, i) =>
        <Meal meal={store.data.meals.values[id]} key={i} isResult={false} />
      )}
    </Container>
  );
}
