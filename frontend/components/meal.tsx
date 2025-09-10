import { router } from "expo-router";
import { useState } from "react";
import { MealNode, useStore } from "@/lib/state";

import { Pressable, Text, View } from "react-native";
import { Button, Card } from "@/components/elements";

import Ionicons from "@expo/vector-icons/Ionicons";

interface MealProps {
  meal: MealNode;
  isResult: boolean;
}

export function Meal({ meal, isResult }: MealProps) {
  const store = useStore();

  const isParent = meal.childMealIDs && meal.childMealIDs.length > 0;
  const [showChildren, setShowChildren] = useState(isParent);

  const food = isParent ? undefined : store.foods[meal.foodID!];
  const name = isParent ? meal.name : store.foods[meal.foodID!].name;
  const scheduled = store.scheduledMeals.includes(name);

  const logMeal = () => {
    console.log("adding this meal to the user's log...");
  };

  const updateItem = () => {
    if (isParent)
      setShowChildren(!showChildren);
    else
      router.push(`/food/info?foodID=${meal.foodID}&editable=1`);
  }

  return (
    <Card transparent={scheduled} flatten={!scheduled}>

      <Pressable onPress={updateItem} className="flex-row justify-between items-center">
        <View>
          <Text className={`text-base ${scheduled ? "font-bold" : ""}`}>{name}</Text>
          {!isParent &&
            <Text className="text-sm font-grey-500">
              {food.calories} calories
            </Text>}
        </View>

        {isParent && !isResult &&
          <Ionicons size={25} color="gray"
            name={`${showChildren ? "chevron-up" : "chevron-down"}`} />
        }

        {isResult &&
          <Button onPress={logMeal} icon="add" transparent iconColor="blue" iconSize={26} />
        }
      </Pressable>

      {!isResult && showChildren &&
        <View className="w-[100%] p-0 m-0">
          {meal.childMealIDs.map((id, i) =>
            <Meal meal={store.meals[id]} key={i} isResult={false} />)}
        </View>
      }
    </Card>
  );
}
