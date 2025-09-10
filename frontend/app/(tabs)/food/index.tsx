import { router } from "expo-router";
import { useState } from "react";
import { useStore } from "@/lib/state";
import { formatDate } from "@/lib/utils";

import { Pressable, Text, View } from "react-native";
import { Button, Card, Container } from "@/components/elements";

import Ionicons from "@expo/vector-icons/Ionicons";

// TODO: store this in the database, add crud api endpoints, store in app state
interface MealNode {
  name?: string;
  foodID?: number;
  servings?: number;
  children: number[]; // list of meal ids
};

const foodDB: Record<number, object> = {
  1: {
    name: "oatmeal",
    calories: 140,
    protein: 5
  },
  2: {
    name: "milk",
    calories: 160,
    protein: 18
  },
  3: {
    name: "bread",
    calories: 180,
    protein: 8
  },
  4: {
    name: "salad mix",
    calories: 200,
    protein: 4,
  },
  5: {
    name: "spagetti",
    calories: 310,
    protein: 5
  },
  6: {
    name: "orange",
    calories: 100,
    protein: 2
  },
}

const rootID = 0;
const scheduledMeals = ["Breakfast", "Lunch", "Dinner"];
const meals: Record<number, MealNode> = {
  0: { name: "Today's date", children: [1, 2, 3] },
  1: { name: "Breakfast", children: [10] },
  2: { name: "Lunch", children: [6, 7] },
  3: { name: "Dinner", children: [8, 9] },
  4: { servings: 2, foodID: 1, children: [] },
  5: { servings: 0.5, foodID: 2, children: [] },
  6: { servings: 1, foodID: 3, children: [] },
  7: { servings: 1, foodID: 4, children: [] },
  8: { servings: 1, foodID: 5, children: [] },
  9: { servings: 1, foodID: 6, children: [] },
  10: { name: "Porridge", children: [4, 5] },
};

function Meal({ meal }: { meal: MealNode }) {
  const isParent = meal.children.length > 0;
  const [showChildren, setShowChildren] = useState(isParent);

  const food = isParent ? undefined : foodDB[meal.foodID!];
  const name = isParent ? meal.name : foodDB[meal.foodID!].name;
  const scheduled = scheduledMeals.includes(name);

  const updateItem = () => {
    if (isParent)
      setShowChildren(!showChildren);
    else
      router.push(`/food/info?foodID=${meal.foodID}&editable=1`);
  }

  return (
    <Card transparent={scheduled} flatten={!scheduled}>
      <Pressable onPress={updateItem} className="flex-row justify-between">
        <Text className={`${scheduled ? "font-bold" : ""}`}>{name}</Text>
        {isParent
          ? <Ionicons size={25} color="gray"
            name={`${showChildren ? "chevron-up" : "chevron-down"}`} />
          : <Text className="font-grey-500">{food.calories}</Text>
        }
      </Pressable>

      {showChildren &&
        <View className="w-[100%] p-0 m-0">
          {meal.children.map((id, i) => <Meal meal={meals[id]} key={i} />)}
        </View>
      }
    </Card>
  );
}

export default function FoodPage() {
  const store = useStore();

  const addFood = () => {
    console.log("adding...");
  }

  const changeDay = (next: boolean) => {
    console.log("changing date...");
  }

  const targets = [
    {
      name: "calories",
      value: 1000,
      target: 2000,
    }
  ];

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

      {targets.map((t, i) => {
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

      {meals[rootID].children.map((id, i) => <Meal meal={meals[id]} key={i} />)}
    </Container>
  );
}
