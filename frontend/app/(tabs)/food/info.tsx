import { useLocalSearchParams } from "expo-router";
import { getFood, useStore } from "@/lib/state";

import { Text, View } from "react-native";
import { BackHeader, Button, Container, Dropdown, Input } from "@/components/elements";

export default function FoodInfo() {
  const store = useStore();

  const { mealID, editable } = useLocalSearchParams();
  const meal = store.data.meals.values[Number(mealID)];
  const food = getFood(store, meal.foodID!);

  const updateServings = (servings: number | undefined, index: number | undefined) => {
    let newMeal = { ...meal };
    if (servings) newMeal.servings = servings;
    if (index) newMeal.servingIndex = index;

    store.upsertMeal(newMeal);
  }

  const removeMeal = () => {
    console.log("removing...");
  }

  return (
    <Container>
      <BackHeader title={food.name} />

      {editable &&
        <View className="border-b-2 border-grey-500 w-[100%] flex-row justify-between px-2">
          <Input
            text={`${meal.servings}`}
            placeholder="1" numeric label="servings"
            setText={(str: string) => updateServings(Number(str), undefined)} />

          <Dropdown
            options={food.servingSizes}
            current={meal.servingIndex!}
            setCurrent={(index: number) => updateServings(undefined, index)}
            currentElement={
              <Text className="text-xs text-surface-color px-3">
                {food.servingSizes[meal.servingIndex!]} {food.servingSizeUnits[meal.servingIndex!]}
              </Text>
            }
            optionElement={(index: number) =>
              <Text className="text-xs px-3">
                {food.servingSizes[index]} {food.servingSizeUnits[index]}
              </Text>
            }
          />

          <Button
            iconColor="red" iconSize={24} icon="trash-outline"
            transparent onPress={removeMeal} />
        </View>
      }

      <View>
        <Text className="text-lg font-bold">Calories {food.calories}</Text>
        <Text className="text-base font-bold">Fat {food.fat}</Text>
        <Text className="text-base font-bold">Carboydrate {food.carbohydrates}</Text>
        <Text className="text-base font-bold">Protein {food.protein}</Text>
        <Text className="text-base font-bold">Cholesterol {food.cholesterol}</Text>
        <Text className="text-base font-bold">Sodium {food.sodium}</Text>

        <View className="border-b-2 border-grey-500 w-[10%]"></View>

        <Text className="text-base font-bold">Calcium {food.calcium}</Text>
        <Text className="text-base font-bold">Magnesium {food.magnesium}</Text>
        <Text className="text-base font-bold">Potassium {food.potassium}</Text>
      </View>
    </Container>
  )
}
