import { useEffect, useState } from "react";

import { useSelector } from "react-redux";

import { FlatList, View } from "react-native";

export default function Index() {
  const workoutsState = useSelector(state => state.workouts);

  const [templates, setTemplates] = useState([]);
  const [workous, setWorkouts] = useState([]);
  useEffect(() => {
    setTemplates(
      workoutsState.workouts
        .map((w, i) => ({ workout: w, index: i }))
        .filter(w => w.workout.isTemplate)
    );

    setWorkouts(
      workoutsState.workouts
        .map((w, i) => ({ workout: w, index: i }))
        .filter(w => !w.workout.isTemplate)
    );
  }, [workoutsState]);

  const now = new Date();
  const lastYear = new Date(new Date().setFullYear(new Date().getFullYear() - 1));
  const data = [];
  for (let d = new Date(lastYear); d <= now; d.setDate(d.getDate() + 1)) {
    data.push({ date: new Date(d), value: Math.floor(Math.random() * 100) });
  }

  const [templateName, setWorkoutName] = useState("");

  return (
    <View className="w-[60%] m-auto">
      {/*
      <View className="flex-row">
        <TextInput
          value={templateName}
          className="bg-white p-3 grow"
          onChangeText={(value) => setWorkoutName(value)} />
        <Pressable
          disabled={templateName.trim().length == 0}
          onPress={() => dispatch(workoutActions.addWorkout({
            value: { isTemplate: true, name: templateName, exercises: [] }
          }))}
          className="bg-blue-100 p-2 items-center">
          <Text> Add Workout</Text>
        </Pressable>
      </View>

      <FlatList
        data={templates}
        renderItem={({ item }) =>
          <EditableWorkoutView workout={item.workout} index={item.index} />}
        keyExtractor={item => item.index} /> */}

      <FlatList
        data={workouts}
        renderItem={({ item }) => <WorkoutView workout={item} />}
        keyExtractor={item => item.index}
      />

      {/*<View className="gap-4">
        <Heatmap data={data} height={150} />
        <LineGraph data={data} height={400} />
      </View>*/}
    </View>
  );
}
