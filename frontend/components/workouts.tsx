import { useDispatch, useSelector } from "react-redux";
import { ExerciseType, ExerciseInfo, WorkoutInfo, workoutActions } from "@/lib/state";
import { request } from "@/lib/utils";

import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import NumInput from "@/components/input";
import { SelectButton } from "@/components/select";
import { Section } from "@/components/container";

import Feather from "@expo/vector-icons/Feather";

interface ViewProps { workout: WorkoutInfo, index: number, disabled?: boolean };

function WorkoutTemplate({ workout, index }: ViewProps) {
  const dispatch = useDispatch();
  const userData = useSelector(state => state.userData);

  const buttonChoices = [
    { label: "Strength", value: ExerciseType.Resistance },
    { label: "Cardio", value: ExerciseType.Cardio },
  ];

  const addExercise = (choice: ExerciseType) => {
    let [defaultName, count] = ["New exercise", 0];
    for (const e of workout.exercises) {
      if (e.name.includes(defaultName)) count++;
    }
    defaultName = `${defaultName} ${count + 1}`;
    dispatch(workoutActions.addExercise({
      workoutIndex: index, value: { name: defaultName, exercise_type: choice }
    }));
  }

  const deleteTemplate = async () => {
    try {
      await request("DELETE", `/workout?id=${workout.id}`, undefined, userData.jwt);
      dispatch(workoutActions.removeWorkout({ workoutIndex: index, value: null }));
    } catch (err) {
      console.log("ERROR!", err.message);
    }
  }

  return (
    <Section>
      <View className="flex-row">
        <TextInput
          className="flex-1 text-xl bg-gray-100 rounded-sm px-3 py-1 outline-none"
          value={workout.tag}
          onChangeText={(value) => dispatch(workoutActions.setTemplateName({
            workoutIndex: index, value
          }))} />
        <Pressable
          onPress={() => deleteTemplate()}
          className="bg-transparent p-2">
          <Feather name="trash" color="red" size={18} />
        </Pressable>
      </View>

      {workout.exercises.map((e, i) => (
        <View key={i}
          className="flex-row w-[100%] justify-between border-t border-gray-100 p-2">
          <TextInput
            value={e.name}
            placeholder="Exercise name"
            onChangeText={(txt) => dispatch(workoutActions.updateExercise({
              workoutIndex: index, exerciseIndex: i, value: { name: txt }
            }))}
            className="outline-none bg-gray-100 px-2" />

          {e.exercise_type == ExerciseType.Resistance &&
            <NumInput num={e.weight} label="lbs" setNum={(n: number) =>
              dispatch(workoutActions.updateExercise({
                workoutIndex: index, exerciseIndex: i, value: { weight: n },
              }))} />}

          <Pressable
            onPress={() => dispatch(workoutActions.removeExercise({
              workoutIndex: index, exerciseIndex: i, value: null
            }))}
            className="bg-transparent p-2">
            <Feather name="trash" color="red" size={18} />
          </Pressable>
        </View>
      ))}

      <SelectButton
        choices={buttonChoices} icon="plus"
        defaultChoice={ExerciseType.Resistance} message=""
        handlePress={(choice: ExerciseType) => addExercise(choice)} />
    </Section>
  );
}

function WorkoutRecord({ workout, index, disabled }: ViewProps) {
  const dispatch = useDispatch();

  const changeRep = (n: number, i: number, eIndex: number) => {
    let reps = [...workout.exercises[eIndex].reps!];
    reps[i] = n;
    dispatch(workoutActions.updateExercise({
      workoutIndex: index, exerciseIndex: eIndex, value: { reps: reps }
    }));
  }

  return (
    <Section>
      {workout.exercises.map((e: ExerciseInfo, eIndex: number) => {
        const str = `${e.name} (${e.weight} lbs)`;

        return (
          <View key={eIndex}
            className="flex-row justify-between items-center p-2 border-t border-gray-100">
            <View className="items-center flex-row max-w-[40%]">
              <Text className="text-l font-bold mr-2 mr-5">{str}</Text>
            </View>

            <View className="flex-row items-center">
              <View className="grid grid-cols-4 grid-flow-row gap-2">
                {e.reps!.map((r: number, i: number) =>
                  <NumInput
                    key={i} num={r} disabled={disabled}
                    setNum={(n: number) => changeRep(n, i, eIndex)} />)}
              </View>

              {!disabled &&
                <Pressable
                  onPress={() =>
                    dispatch(workoutActions.updateExercise({
                      workoutIndex: index, exerciseIndex: eIndex,
                      value: { reps: [...workout.exercises[eIndex].reps!, 0] }
                    }))
                  }
                  className="bg-transparent px-4 px-2 rounded">
                  <Feather name="plus" color="blue" size={20} />
                </Pressable>}
            </View>
          </View>
        );
      })}
    </Section>
  );
}

export const WorkoutTemplateMemo = React.memo(WorkoutTemplate);
export const WorkoutRecordMemo = React.memo(WorkoutRecord);
