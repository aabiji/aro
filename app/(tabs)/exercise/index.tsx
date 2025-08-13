import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

import { FlatList, View } from "react-native";
import { WorkoutView } from "@/components/workout_views";

export default function Index() {
  const workoutsState = useSelector(state => state.workouts);

  const [workouts, setWorkouts] = useState([]);
  useEffect(() => {
    setWorkouts(
      workoutsState.workouts
        .map((w, i) => ({ workout: w, index: i }))
        .filter(w => !w.workout.isTemplate)
    );
  }, [workoutsState]);

  return (
    <View className="w-[60%] m-auto h-[100%]">
      <FlatList
        data={workouts}
        renderItem={({ item }) => <WorkoutView workout={item.workout} index={item.index} />}
        keyExtractor={item => item.index}
      />
    </View>
  );
}
