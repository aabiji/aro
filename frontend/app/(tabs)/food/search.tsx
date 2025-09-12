import { useState } from "react";
import { MealNode, useStore } from "@/lib/state";
import { request } from "@/lib/utils";

import { FlatList, Text, View } from "react-native";
import { BackHeader, Button, Container, Input } from "@/components/elements";
import { Meal } from "@/components/meal";

export default function FoodSearchPage() {
  const store = useStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]); // list of meals

  const searchFood = async () => {
    try {
      const params = new URLSearchParams();
      params.append("query", query);
      const json =
        await request("GET", `/auth/food?${params.toString()}`, undefined, undefined);

      let results = [] as MealNode[];
      for (const food of json.results) {
        store.upsertFood(food);
        results.push({ foodID: food.id });
      }
      setResults(results);
    } catch (err: any) {
      console.log("ERROR!", err);
    }
  };

  const fetchMore = () => {
    console.log("TODO: getting more results...");
  };

  return (
    <Container>
      <BackHeader title={"Search foods"} />

      <View className="flex-row px-3 m-auto w-[100%]">
        <Input
          placeholder="Search for foods" text={query} setText={setQuery}
          className="w-[92%] bg-surface-color"
        />
        <Button icon="add" iconSize={26} onPress={searchFood} iconColor="white" />
      </View>

      <FlatList
        data={results}
        ListEmptyComponent={
          <Text className="text-center text-sm text-grey-400">Nothing found</Text>
        }
        className="w-[100%] px-3" onEndReached={fetchMore}
        renderItem={({ item }) => <Meal meal={item} isResult={true} />} />
    </Container>
  );
}
