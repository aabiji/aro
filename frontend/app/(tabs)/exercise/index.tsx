import { useMemo } from "react";
import { ExerciseInfo, useStore, WorkoutInfo } from "@/lib/state";
import { formatDate, request } from "@/lib/utils";

import { FlatList, Text, View } from "react-native";
import StateSync from "@/components/sync";
import { Section, ScrollContainer, Empty } from "@/components/container";
import { WorkoutRecordMemo } from "@/components/workouts";
import { SelectButton } from "@/components/select";

export default function Index() {
  const today = formatDate(new Date());
  const { jwt, upsertWorkout, workouts } = useStore();

  const sortedWorkouts = useMemo(() => {
    return Object.values(workouts)
      .filter((w: WorkoutInfo) => !w.is_template)
      .sort((a: WorkoutInfo, b: WorkoutInfo) => new Date(b.tag).getTime() - new Date(a.tag).getTime());
  }, [workouts]);

  const choices = useMemo(() => {
    return Object.values(workouts)
      .filter((w: WorkoutInfo) => w.is_template && w.exercises.length > 0)
      .map((w: WorkoutInfo) => ({ label: w.tag, value: w.tag }));
  }, [workouts]);

  const addWorkout = async (templateName: string) => {
    const template: WorkoutInfo =
      Object.values(workouts).find((w: WorkoutInfo) => w.tag == templateName);
    let body = { is_template: false, tag: today, exercises: [] as ExerciseInfo[] };

    for (const e of template.exercises) {
      body.exercises.push({
        name: e.name,
        exerciseType: e.exercise_type,
        reps: [],
        duration: 0,
        distance: 0,
        weight: e.weight ?? 0,
      });
    }

    try {
      const json = await request("POST", "/auth/workout", body, jwt);
      upsertWorkout(json.workout);
    } catch (err: any) {
      console.log("ERROR!", err.message);
    }
  };

  return (
    <StateSync>
      <ScrollContainer>
        <FlatList
          data={sortedWorkouts}
          keyExtractor={(item: WorkoutInfo) => item.id}
          ListHeaderComponent={
            <View>
              <Text className="font-bold text-xl mb-2">{today}</Text>
              {choices.length == 0 ? (
                <Empty messages={["You have no workout templates"]} />
              ) : (
                <Section>
                  <SelectButton
                    choices={choices}
                    defaultChoice={choices[0].value}
                    message="Add workout"
                    handlePress={(choice: string) => addWorkout(choice)}
                  />
                </Section>
              )}
              <View className="mt-2 mb-2 border-b-2 border-gray-200"></View>
            </View>
          }
          renderItem={({ item, index }) => {
            const prev = sortedWorkouts[sortedWorkouts.length - 1 - index].tag;
            const showDate =
              index > 0 && prev !== sortedWorkouts[sortedWorkouts.length - index].tag;

            return (
              <View>
                {showDate && (
                  <Text className="font-bold text-xl mb-2">{item.tag}</Text>
                )}
                <WorkoutRecordMemo disabled={item.tag != today} workout={item} />
              </View>
            );
          }}
        />
      </ScrollContainer>
    </StateSync>
  );
}
