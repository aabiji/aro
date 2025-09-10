import { router } from "expo-router";
import { useState } from "react";
import { useStore } from "@/lib/state";
import { request } from "@/lib/utils";

import { FlatList, Platform, Text, View } from "react-native";
import { BackHeader, Button, Container, Input } from "@/components/elements";
import { Meal } from "@/components/meal";

export default function FoodSearchPage() {
  const store = useStore();
  const [query, setQuery] = useState("");

  const searchFood = () => {
    console.log("searching for ...", query);
    const endpoint = `/food?query=${query}&queryType=text&os=${Platform.OS}`;
  };

  const fetchMore = () => {
    console.log("getting more results...");
  };

  const results = [{ foodID: 1 }, { foodID: 2 }, { foodID: 3 }, { foodID: 4 }, { foodID: 5 }, { foodID: 6 },
  ];

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
