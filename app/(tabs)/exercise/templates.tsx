import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { workoutActions } from "@/lib/state";

import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { EditableWorkoutView } from "@/components/workout_views";
import ScrollContainer from "@/components/container";
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
  }, [workoutsState]);

  const addTemplate = () => {
    const exists = templates.find(w => w.workout.name == templateName);
    if (exists) return;
    dispatch(workoutActions.addWorkout({
      value: { isTemplate: true, name: templateName, exercises: [] }
    }));
  }

  return (
    <ScrollContainer>
      <View className="flex-row mb-5">
        <TextInput
          value={templateName} placeholder="Template name"
          className="bg-white p-3 grow outline-none"
          onChangeText={(value) => setWorkoutName(value)} />
        <Pressable
          disabled={templateName.trim().length == 0}
          onPress={() => addTemplate()}
          className="flex-row gap-1 bg-blue-500 p-2 items-center">
          <Feather name="plus" color="white" size={20} />
          <Text className="text-white"> New template </Text>
        </Pressable>
      </View>

      <FlatList
        data={templates}
        className="w-[100%]"
        keyExtractor={item => item.index}
        renderItem={({ item }) =>
          <EditableWorkoutView workout={item.workout} index={item.index} />}
      />
    </ScrollContainer>
  );
}
