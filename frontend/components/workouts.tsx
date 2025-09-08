import React, { useState } from "react";

import { ExerciseInfo, ExerciseType, useStore, WorkoutInfo } from "@/lib/state";
import { AppState } from "@/lib/state";
import { request } from "@/lib/utils";
import useDelayedAction from "@/lib/action";

import { Text, View } from "react-native";
import { Card, Input, Button, Dropdown } from "@/components/elements";

const updateWorkout = async (workout: WorkoutInfo, store: AppState) => {
  try {
    // update = delete then create again
    await request("DELETE", `/auth/workout?id=${workout.id}`, undefined, store.jwt);
    store.removeWorkout(workout.id!);

    // remove existing ids
    delete workout.id;
    for (let exercise of workout.exercises)
      delete exercise.id;

    const json = await request("POST", "/auth/workout", workout, store.jwt);
    store.upsertWorkout(json.workout);
  } catch (err: any) {
    console.log("ERROR!", err);
  }
}

function WorkoutTemplate({ workout }: { workout: WorkoutInfo }) {
  const store = useStore();
  const trigger = useDelayedAction();

  const buttonChoices = [
    { label: "Strength", value: ExerciseType.Resistance },
    { label: "Cardio", value: ExerciseType.Cardio },
  ];
  const [currentChoice, setCurrentChoice] = useState(0);

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

  const update = (fn: () => void) => {
    fn();
    trigger(() => updateWorkout(workout, store));
  }

  return (
    <Card>
      <View className="flex-row items-center">
        <Input
          placeholder="Template name" className="w-[90%]"
          text={workout.tag}
          setText={(value: string) => update(() =>
            store.upsertWorkout({ id: workout.id, tag: value })
          )} />
        <Button
          icon="trash-outline" transparent iconColor="red"
          onPress={() => deleteTemplate()} />
      </View>

      {workout.exercises.map((e: ExerciseInfo, i: number) => (
        <View key={i} className="flex-row w-[100%] justify-between border-t border-neutral-100 p-2">
          <Input text={e.name} placeholder="Exercise name"
            setText={(name: string) =>
              update(() => store.updateExercise(workout.id, i, { name }))} />

          {e.exerciseType == ExerciseType.Resistance && (
            <Input text={`${e.weight}`} label="lbs" placeholder="0"
              setText={(txt: string) => update(() =>
                store.updateExercise(workout.id, i, { weight: Number(txt) }))
              } />
          )}

          <Button
            icon="trash-outline" transparent iconColor="red" iconSize={18}
            onPress={() => update(() => store.removeExercise(workout.id, i))} />
        </View>
      ))}

      <Dropdown
        options={buttonChoices}
        current={currentChoice} setCurrent={setCurrentChoice}
        currentElement={
          <Button
            onPress={() => update(() => insertExercise(buttonChoices[currentChoice].value))}
            text={`Add ${buttonChoices[currentChoice].label}`} />
        }
        optionElement={(index: number) =>
          <Text className="text-center">{buttonChoices[index].label}</Text>}
      />
    </Card>
  );
}

function WorkoutRecord({ workout, disabled }: { workout: WorkoutInfo; disabled: boolean; }) {
  const store = useStore();
  const trigger = useDelayedAction();

  const update = (fn: () => void) => {
    fn();
    trigger(() => updateWorkout(workout, store));
  }

  const changeRep = (n: number, i: number, eIndex: number) => {
    let reps = [...workout.exercises[eIndex].reps!];
    reps[i] = n;
    store.updateExercise(workout.id, eIndex, { reps });
  };

  return (
    <Card>
      {workout.exercises.map((e: ExerciseInfo, eIndex: number) => {
        const str = `${e.name} (${e.weight} lbs)`;

        return (
          <View key={eIndex}
            className="flex-row justify-between items-center p-2 border-t border-neutral-100">
            <View className="items-center flex-row max-w-[40%]">
              <Text className="text-l mr-2">{str}</Text>
            </View>

            <View className="flex-row items-center">
              <View className="flex-row flex-wrap max-w-[100px] gap-x-2">
                {e.reps!.map((r: number, i: number) => (
                  <Input key={i} text={`${r}`} disabled={disabled} placeholder="0" numeric
                    setText={(str: string) => update(() => changeRep(Number(str), i, eIndex))} />
                ))}
              </View>

              {!disabled && (
                <Button
                  icon="add" transparent iconColor="grey" iconSize={20}
                  onPress={() => update(() =>
                    store.updateExercise(workout.id, eIndex, {
                      reps: [...workout.exercises[eIndex].reps!, 0],
                    }))
                  } />
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
