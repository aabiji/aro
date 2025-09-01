import { ExerciseInfo, ExerciseType, useStore, WorkoutInfo } from "@/lib/state";
import { request } from "@/lib/utils";

import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import NumInput from "@/components/input";
import { SelectButton } from "@/components/select";
import { Card } from "@/components/container";

import Ionicons from "@expo/vector-icons/Ionicons";

function WorkoutTemplate({ workout }: { workout: WorkoutInfo }) {
  const store = useStore();

  const buttonChoices = [
    { label: "Strength", value: ExerciseType.Resistance },
    { label: "Cardio", value: ExerciseType.Cardio },
  ];

  const insertExercise = (choice: ExerciseType) => {
    let [defaultName, count] = ["New exercise", 0];
    for (const e of workout.exercises) {
      if (e.name.includes(defaultName)) count++;
    }
    defaultName = `${defaultName} ${count + 1}`;
    store.addExercise(workout.id, {
      name: defaultName,
      exerciseType: choice,
      weight: 0, reps: [],
      id: 0, duration: 0, distance: 0,
    });
  };

  const deleteTemplate = async () => {
    try {
      await request("DELETE", "/auth/workout", { ids: [workout.id] }, store.jwt);
      store.removeWorkout(workout.id);
    } catch (err: any) {
      console.log("ERROR!", err.message);
    }
  };

  return (
    <Card border>
      <View className="flex-row">
        <TextInput value={workout.tag}
          className="flex-1 text-xl bg-neutral-100 rounded-sm px-3 py-1 outline-none"
          onChangeText={(value: string) =>
            store.upsertWorkout({ id: workout.id, name: value })
          } />
        <Pressable onPress={() => deleteTemplate()} className="bg-transparent p-2">
          <Ionicons name="trash-outline" color="red" size={18} />
        </Pressable>
      </View>

      {workout.exercises.map((e: ExerciseInfo, i: number) => (
        <View key={i} className="flex-row w-[100%] justify-between border-t border-neutral-100 p-2">
          <TextInput value={e.name} placeholder="Exercise name"
            className="outline-none bg-neutral-100 px-2"
            onChangeText={(name: string) => store.updateExercise(workout.id, i, { name })} />

          {e.exerciseType == ExerciseType.Resistance && (
            <NumInput num={e.weight} label="lbs"
              setNum={(weight: number) =>
                store.updateExercise(workout.id, i, { weight })
              } />
          )}

          <Pressable className="bg-transparent p-2" onPress={() => store.removeExercise(workout.id, i)}>
            <Ionicons name="trash-outline" color="red" size={18} />
          </Pressable>
        </View>
      ))}

      <SelectButton defaultChoice={ExerciseType.Resistance}
        choices={buttonChoices} icon="plus" message=""
        handlePress={(choice: ExerciseType) => insertExercise(choice)} />
    </Card>
  );
}

function WorkoutRecord({ workout, disabled }: { workout: WorkoutInfo; disabled: boolean; }) {
  const store = useStore();

  const changeRep = (n: number, i: number, eIndex: number) => {
    let reps = [...workout.exercises[eIndex].reps!];
    reps[i] = n;
    store.updateExercise(workout.id, eIndex, { reps });
  };

  return (
    <Card border>
      {workout.exercises.map((e: ExerciseInfo, eIndex: number) => {
        const str = `${e.name} (${e.weight} lbs)`;

        return (
          <View key={eIndex}
            className="flex-row justify-between items-center p-2 border-t border-neutral-100">
            <View className="items-center flex-row max-w-[40%]">
              <Text className="text-l mr-2">{str}</Text>
            </View>

            <View className="flex-row items-center">
              <View className="grid grid-cols-4 grid-flow-row gap-2">
                {e.reps!.map((r: number, i: number) => (
                  <NumInput key={i} num={r} disabled={disabled}
                    setNum={(n: number) => changeRep(n, i, eIndex)} />
                ))}
              </View>

              {!disabled && (
                <Pressable
                  onPress={() =>
                    store.updateExercise(workout.id, eIndex, {
                      reps: [...workout.exercises[eIndex].reps!, 0],
                    })
                  }
                  className="bg-transparent px-2 rounded">
                  <Ionicons name="add" color="grey" size={20} />
                </Pressable>
              )}
            </View>
          </View>
        );
      })}
    </Card>
  );
}

export const WorkoutTemplateMemo = React.memo(WorkoutTemplate);
export const WorkoutRecordMemo = React.memo(WorkoutRecord);
