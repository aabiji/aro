import {
  Exercise, ExerciseInfo, ExerciseType,
  useStore, WorkoutInfo } from "@/lib/state";
import { request } from "@/lib/utils";

import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import NumInput from "@/components/input";
import { SelectButton } from "@/components/select";
import { Section } from "@/components/container";

import Feather from "@expo/vector-icons/Feather";

function WorkoutTemplate({ workout }: {workout: WorkoutInfo}) {
  const {
    addExercise, jwt, removeExercise,
    removeWorkout, updateExercise, upsertWorkout
  } = useStore();

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
    addExercise(workout.id, {
      name: defaultName,
      exerciseType: choice,
      weight: 0, reps: [], id: 0,
      duration: 0, distance: 0,
    });
  };

  const deleteTemplate = async () => {
    try {
      await request("DELETE", `/auth/workout?id=${workout.id}`, undefined, jwt);
      removeWorkout(workout.id);
    } catch (err: any) {
      console.log("ERROR!", err.message);
    }
  };

  return (
    <Section>
      <View className="flex-row">
        <TextInput
          className="flex-1 text-xl bg-gray-100 rounded-sm px-3 py-1 outline-none"
          value={workout.tag}
          onChangeText={(value) => upsertWorkout({ id: workout.id, name: value })}
        />
        <Pressable onPress={() => deleteTemplate()} className="bg-transparent p-2">
          <Feather name="trash" color="red" size={18} />
        </Pressable>
      </View>

      {workout.exercises.map((e: Exercise, i: number) => (
        <View
          key={i}
          className="flex-row w-[100%] justify-between border-t border-gray-100 p-2"
        >
          <TextInput
            value={e.name}
            placeholder="Exercise name"
            className="outline-none bg-gray-100 px-2"
            onChangeText={(name) => updateExercise(workout.id, i, { name })}
          />

          {e.exerciseType == ExerciseType.Resistance && (
            <NumInput
              num={e.weight}
              label="lbs"
              setNum={(weight: number) => updateExercise(workout.id, i, { weight })}
            />
          )}

          <Pressable
            onPress={() => removeExercise(workout.id, i)}
            className="bg-transparent p-2">
            <Feather name="trash" color="red" size={18} />
          </Pressable>
        </View>
      ))}

      <SelectButton
        choices={buttonChoices}
        icon="plus"
        defaultChoice={ExerciseType.Resistance}
        message=""
        handlePress={(choice: ExerciseType) => insertExercise(choice)}
      />
    </Section>
  );
}

function WorkoutRecord({ workout, disabled }: {workout: WorkoutInfo, disabled: boolean}) {
  const { updateExercise } = useStore();

  const changeRep = (n: number, i: number, eIndex: number) => {
    let reps = [...workout.exercises[eIndex].reps!];
    reps[i] = n;
    updateExercise(workout.id, eIndex, { reps });
  };

  return (
    <Section>
      {workout.exercises.map((e: ExerciseInfo, eIndex: number) => {
        const str = `${e.name} (${e.weight} lbs)`;

        return (
          <View
            key={eIndex}
            className="flex-row justify-between items-center p-2 border-t border-gray-100"
          >
            <View className="items-center flex-row max-w-[40%]">
              <Text className="text-l font-bold mr-2 mr-5">{str}</Text>
            </View>

            <View className="flex-row items-center">
              <View className="grid grid-cols-4 grid-flow-row gap-2">
                {e.reps!.map((r: number, i: number) => (
                  <NumInput
                    key={i}
                    num={r}
                    disabled={disabled}
                    setNum={(n: number) => changeRep(n, i, eIndex)}
                  />
                ))}
              </View>

              {!disabled && (
                <Pressable
                  onPress={() => updateExercise(workout.id, eIndex, {
                    reps: [...workout.exercises[eIndex].reps!, 0] })}
                  className="bg-transparent px-4 px-2 rounded">
                  <Feather name="plus" color="blue" size={20} />
                </Pressable>
              )}
            </View>
          </View>
        );
      })}
    </Section>
  );
}

export const WorkoutTemplateMemo = React.memo(WorkoutTemplate);
export const WorkoutRecordMemo = React.memo(WorkoutRecord);
