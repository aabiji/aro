import { useState } from "react";
import { useDispatch } from "react-redux";
import { Exercise, Workout, workoutActions } from "@/lib/state";

import { Pressable, Text, TextInput, View } from "react-native";
import { Dropdown } from 'react-native-element-dropdown';
import NumInput from "@/components/input";

import Feather from "@expo/vector-icons/Feather";

interface ViewProps { workout: Workout, index: number };

export function EditableWorkoutView({ workout, index }: ViewProps) {
  const dispatch = useDispatch();

  const buttonChoices = [
    { label: "Strength exercise", value: "strength" },
    { label: "Cardio exercise", value: "cardio" },
  ];
  const [exerciseType, setExerciseType] = useState("strength");

  return (
    <View className="w-[100%] m-auto border border-gray-200 p-2 bg-white mt-5">
      <TextInput
        className="text-xl"
        value={workout.name}
        onChangeText={(value) => dispatch(workoutActions.setWorkoutName({
          workoutIndex: index, value
        }))} />

      {workout.exercises.map((e, i) => (
        <View key={i} className="flex-row justify-between border-t border-gray-100 p-2">
          <TextInput
            value={e.name}
            placeholder="Exercise name"
            onChangeText={(txt) => dispatch(workoutActions.updateExercise({
              workoutIndex: index, exerciseIndex: i, value: { name: txt }
            }))}
            className="outline-none bg-gray-100 px-2" />

          {e.exerciseType == "strength" &&
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

      <View className="flex-row items-center justify-between mt-5 bg-blue-50 rounded">
        <Dropdown
          data={buttonChoices}
          value={exerciseType}
          placeholder="Exercise type"
          labelField="label"
          valueField="value"
          style={{ flex: 1 }}
          onChange={item => setExerciseType(item.value)}
          renderItem={item => <Text className="p-2">{item.label}</Text>}
        />
        <Pressable
          onPress={() => dispatch(workoutActions.addExercise({
            workoutIndex: index, value: { name: "", exerciseType }
          }))}
          className="ml-2 p-4"
        >
          <Feather name="plus" color="black" size={20} />
        </Pressable>
      </View>
    </View >
  );
}

export function WorkoutView({ workout, index }: ViewProps) {
  const dispatch = useDispatch();

  const changeRep = (n: number, i: number, eIndex: number) => {
    let reps = workout.exercises[eIndex].reps!;
    reps[i] = n;
    dispatch(workoutActions.updateExercise({
      workoutIndex: index, exerciseIndex: i, value: { reps: reps }
    }));
  }

  return (
    <View className="w-[100%] m-auto border border-gray-200 p-2 bg-white mt-5">
      <Text className="text-xl">{workout.date}</Text>
      {workout.exercises.map((e: Exercise, eIndex: number) => {
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
                  <NumInput key={i} num={r} setNum={(n: number) => changeRep(n, i, eIndex)} />)}
              </View>

              <Pressable
                onPress={() =>
                  dispatch(workoutActions.updateExercise({
                    workoutIndex: index, exerciseIndex: eIndex,
                    value: { reps: [...workout.exercises[eIndex].reps!, 0] }
                  }))
                }
                className="bg-transparent px-4 px-2 rounded">
                <Feather name="plus" color="blue" size={20} />
              </Pressable>
            </View>
          </View>
        );
      })}
    </View>
  );
}
