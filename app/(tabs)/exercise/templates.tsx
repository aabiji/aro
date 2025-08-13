import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { workoutActions } from "@/lib/state";

import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { EditableWorkoutView } from "@/components/workout_views";

export default function TemplatesPage() {
  const dispatch = useDispatch();
  const workoutsState = useSelector(state => state.workouts);

  const [templateName, setWorkoutName] = useState("");
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    setTemplates(
      workoutsState.workouts
        .map((w, i) => ({ workout: w, index: i }))
        .filter(w => w.workout.isTemplate)
    );
  }, []);

  return (
    <View className="w-[60%] m-auto h-[100%]">
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
        keyExtractor={item => item.index} />
    </View>
  );
}
