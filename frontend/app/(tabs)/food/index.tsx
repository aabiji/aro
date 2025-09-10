import { useState } from "react";
import { router } from "expo-router";
import { useStore } from "@/lib/state";
import { formatDate } from "@/lib/utils";

import { Text, View } from "react-native";
import { Button, Card, Container } from "@/components/elements";
import { Meal } from "@/components/meal";

export default function FoodPage() {
  const store = useStore();

  const addFood = () => {
    console.log("adding...");
    router.push("/food/search");
  }

  const changeDay = (next: boolean) => {
    console.log("changing date...");
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
          <Button icon="add" iconSize={26} iconColor="white" onPress={addFood} />
          <Button
            icon="chevron-forward" iconSize={24}
            iconColor="#808080" transparent
            onPress={() => changeDay(true)} />
        </View>
      </View>

      {store.macroTargets.map((t, i) => {
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
      })}

      {store.meals[0].childMealIDs.map((id, i) =>
        <Meal meal={store.meals[id]} key={i} isResult={false} />)}
    </Container>
  );
}
