import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { ExerciseInfo, useStore, WorkoutInfo } from "@/lib/state";
import { formatDate, request } from "@/lib/utils";

import { FlatList, Pressable, Text, View } from "react-native";
import { WorkoutRecordMemo } from "@/components/workouts";
import { Card, Container, Button, Dropdown } from "@/components/elements";

import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

export default function Index() {
  const router = useRouter();
  const today = formatDate(new Date(), "long");
  const store = useStore();

  const sortedWorkouts = useMemo(() => {
    return Object.values(store.data.workouts.values)
      .sort((a: WorkoutInfo, b: WorkoutInfo) =>
          new Date(b.tag).getTime() - new Date(a.tag).getTime(),
      );
  }, [store.data.workouts.values]);

  const choices = useMemo(() => {
    return Object.values(store.data.templates.values).map(w => w.tag);
  }, [store.data.templates.values]);

  const [currentChoice, setCurrentChoice] = useState(0);

  const addWorkout = async (templateName: string) => {
    // create a workout based off of a template of what it should contain
    const template = Object.values(store.data.templates.values)
      .find(t => t.tag == templateName)!;
    let data = { isTemplate: false, tag: today, exercises: [] as ExerciseInfo[] };

    for (const e of template.exercises) {
      data.exercises.push({
        name: e.name, exerciseType: e.exerciseType,
        reps: [], duration: 0, distance: 0,
        weight: e.weight ?? 0,
      });
    }

    try {
      const json = await request("POST", "/auth/workout", data, store.jwt);
      store.upsertWorkout(json.workout);
    } catch (err: any) {
      console.log("ERROR!", err.message);
    }
  };

  const fetchMore = async () => {
    if (!store.data.workouts.more) return;
    try {
      const payload = { page: store.data.workouts.page, includeWorkouts: true };
      const json = await request("POST", "/auth/user", payload, store.jwt);
      for (const w of json.user.workouts)
        store.upsertWorkout(w);
      store.paginate("workouts", json.moreWorkouts);
    } catch (err: any) {
      console.log("ERROR!", err);
    }
  };

  return (
    <Container>
      <FlatList
        data={sortedWorkouts} onEndReached={fetchMore}
        keyExtractor={(item: WorkoutInfo) => String(item.id)}
        ListEmptyComponent={
          <Text className="text-xl text-gray-400 m-auto">No workouts</Text>
        }
        ListHeaderComponent={
          <Card>
            <Text className="font-bold text-xl mb-2">{today}</Text>

            <View className="flex-row justify-between">
              <Pressable
                onPress={() => router.push("/exercise/progress")}
                className="flex-row items-center mb-2">
                <Text className="text-gray-500 font-bold text-base mr-1">View progress</Text>
                <MaterialCommunityIcons name="arrow-top-right" size={24} color="gray" />
              </Pressable>

              <Pressable
                onPress={() => router.push("/exercise/templates")}
                className="flex-row items-center mb-2">
                <Text className="text-gray-500 font-bold text-base mr-1">Edit templates</Text>
                <MaterialCommunityIcons name="arrow-top-right" size={24} color="gray" />
              </Pressable>
            </View>

            {choices.length == 0 ? (
              <Text className="text-center text-sm text-neutral-500">
                No workout templates
              </Text>
            ) : (
              <Dropdown
                options={choices}
                current={currentChoice} setCurrent={setCurrentChoice}
                currentElement={
                  <Button text={`Add ${choices[currentChoice]}`}
                    onPress={() => addWorkout(choices[currentChoice])} />
                }
                optionElement={(index: number) => (
                  <Text className="text-surface-color">{choices[index]}</Text>
                )}
              />
            )}
          </Card>
        }
        renderItem={({ item, index }) => {
          const prevTag = sortedWorkouts[index - 1]?.tag;
          const showDate = index > 0 && item.tag !== prevTag;

          return (
            <View>
              {showDate && (
                <Card>
                  <Text className="font-bold text-xl mb-2">{item.tag}</Text>
                </Card>
              )}
              <WorkoutRecordMemo disabled={item.tag !== today} workout={item} />
            </View>
          );
        }} />
    </Container>
  );
}
