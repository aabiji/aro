import { router } from "expo-router";
import { useState } from "react";
import { getFood, MealNode, useStore } from "@/lib/state";
import { formatDate, request } from "@/lib/utils";

import { Pressable, Text, View } from "react-native";
import { Button, Card } from "@/components/elements";

import Ionicons from "@expo/vector-icons/Ionicons";

interface MealProps { meal: MealNode; isResult: boolean; }

export function Meal({ meal, isResult }: MealProps) {
  const store = useStore();

  const isParent = meal.childMeals && meal.childMeals.length > 0;
  const [showChildren, setShowChildren] = useState(isParent);

  const food = isParent ? undefined : getFood(store, meal.foodID!)!;
  const name = isParent ? meal.name : food.name
  const root = meal.parentID === undefined || meal.parentID === 0;

  const addMeal = async () => {
    let newMeal: MealNode = { // TODO: parent id??
      foodID: food.id,
      servingIndex: 0,
      servings: 1,
      name: food.name,

      // TODO: determine which scheduled meal we should add this to
      parentID: store.dailyMeals[formatDate(new Date(), "long")][0],
    };

    try {
      const json = await request("POST", "/auth/meal", newMeal, store.jwt);
      newMeal.id = json.id;

      store.upsertMeal(newMeal);
      const updatedParent = {
        ...store.data.meals.values[newMeal.parentID!],
        childMeals: [...store.data.meals.values[newMeal.parentID!].childMeals!, newMeal.id],
      };
      store.upsertMeal(updatedParent);

      router.back(); // go from the food search page to the food index page
    } catch (err: any) {
      console.log("ERROR!", err);
    }

    console.log("adding this meal to the user's log...");
  };

  const updateItem = () => {
    if (isParent)
      setShowChildren(!showChildren);
    else
      router.push(`/food/info?mealID=${meal.id}&editable=${isResult ? 0 : 1}`);
  }

  return (
    <Card transparent={root} flatten={!root}>

      <Pressable onPress={updateItem} className="flex-row justify-between items-center">
        <View>
          <Text className={`text-base ${root ? "font-bold" : ""}`}>{name}</Text>
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
          <Button onPress={addMeal} icon="add" transparent iconColor="blue" iconSize={26} />
        }
      </Pressable>

      {!isResult && showChildren &&
        <View className="w-[100%] p-0 m-0">
          {meal.childMeals!.map((id, i) =>
            <Meal meal={store.data.meals.values[id]} key={i} isResult={false} />)}
        </View>
      }
    </Card>
  );
}
