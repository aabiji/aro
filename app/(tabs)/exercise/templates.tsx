import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { workoutActions } from "@/lib/state";

import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { EditableWorkoutView } from "@/components/workout_views";
import Feather from "@expo/vector-icons/Feather";

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
          className="bg-white p-3 grow outline-none"
          onChangeText={(value) => setWorkoutName(value)} />
        <Pressable
          disabled={templateName.trim().length == 0}
          onPress={() => dispatch(workoutActions.addWorkout({
            value: { isTemplate: true, name: templateName, exercises: [] }
          }))}
          className="flex-row gap-1 bg-blue-500 p-2 items-center">
          <Feather name="plus" color="white" size={20} />
          <Text className="text-white"> New template </Text>
        </Pressable>
      </View>

      <FlatList
        data={templates} inverted={true} keyExtractor={item => item.index}
        renderItem={({ item }) =>
          <EditableWorkoutView workout={item.workout} index={item.index} />}
      />
    </View>
  );
}
