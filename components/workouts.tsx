import { useDispatch } from "react-redux";
import { Exercise, Workout, workoutActions } from "@/lib/state";

import { Pressable, Text, TextInput, View } from "react-native";
import NumInput from "@/components/input";
import SelectButton from "@/components/select";
import { Section } from "@/components/container";

import Feather from "@expo/vector-icons/Feather";

interface ViewProps { workout: Workout, index: number };

export function WorkoutTemplate({ workout, index }: ViewProps) {
  const dispatch = useDispatch();

  const buttonChoices = [
    { label: "Strength", value: "strength" },
    { label: "Cardio", value: "cardio" },
  ];

  const addExercise = (choice: string) => {
    let [defaultName, count] = ["New exercise", 0];
    for (const e of workout.exercises) {
      if (e.name.includes(defaultName)) count++;
    }
    defaultName = `${defaultName} ${count + 1}`;
    dispatch(workoutActions.addExercise({
      workoutIndex: index, value: { name: defaultName, exerciseType: choice }
    }));
  }

  return (
    <Section>
      <TextInput
        className="text-xl bg-gray-100 rounded-sm px-3 py-1 outline-none"
        value={workout.name}
        onChangeText={(value) => dispatch(workoutActions.setWorkoutName({
          workoutIndex: index, value
        }))} />

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

      <SelectButton
        choices={buttonChoices} icon="plus"
        defaultChoice="strength" message=""
        handlePress={(choice: string) => addExercise(choice)} />
    </Section>
  );
}

export function WorkoutRecord({ workout, index }: ViewProps) {
  const dispatch = useDispatch();

  const changeRep = (n: number, i: number, eIndex: number) => {
    let reps = workout.exercises[eIndex].reps!;
    reps[i] = n;
    dispatch(workoutActions.updateExercise({
      workoutIndex: index, exerciseIndex: i, value: { reps: reps }
    }));
  }

  return (
    <Section>
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
    </Section>
  );
}
