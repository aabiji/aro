import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useStore } from "@/lib/state";

import { Text, View } from "react-native";
import { BackHeader, Button, Container, Input } from "@/components/elements";

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

interface RouteParams {
  foodID: number;
  editable: boolean;
}

export default function FoodInfo() {
  const store = useStore();
  const [servings, setServings] = useState(1);

  // TODO: make get request to get food info by id

  const { foodID, editable } = useLocalSearchParams<RouteParams>();
  const food = foodDB[foodID];

  const removeMeal = () => {
    console.log("removing...");
  }

  return (
    <Container>
      <BackHeader title={food.name} />

      {editable &&
        <View className="border-b-2 border-grey-500 w-[100%] flex-row justify-between px-2">
          <Input
            text={`${servings}`}
            placeholder="1" numeric label="servings"
            setText={(str: string) => setServings(Number(str))} />
          {/*should be in top left, prominnet*/}
          <Button
            iconColor="red" iconSize={24} icon="trash-outline"
            transparent onPress={removeMeal} />
        </View>
      }

      {/*TODO: sort by importance and have style (font size) determined by importance*/}
      <View>
        <Text className="text-lg font-bold">Calories {food.calories}</Text>
        <Text className="text-base font-bold">Fat { }</Text>
        <Text className="text-base font-bold">Carboydrate { }</Text>
        <Text className="text-base font-bold">Protein {food.protein}</Text>
        <Text className="text-base font-bold">Cholesterol { }</Text>
        <Text className="text-base font-bold">Sodium { }</Text>

        <View className="border-b-2 border-grey-500 w-[10%]"></View>

        <Text className="text-base font-bold">Potassium { }</Text>
        <Text className="text-base font-bold">Calcium { }</Text>
        <Text className="text-base font-bold">Iron { }</Text>
      </View>

    </Container>
  )
}
