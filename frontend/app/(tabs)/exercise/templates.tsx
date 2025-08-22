import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { workoutActions } from "@/lib/state";
import { request } from "@/lib/utils";

import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import WorkoutStateSync from "@/components/sync";
import { WorkoutTemplateMemo } from "@/components/workouts";
import { ScrollContainer, Empty } from "@/components/container";
import Feather from "@expo/vector-icons/Feather";

export default function TemplatesPage() {
  const dispatch = useDispatch();
  const workoutsState = useSelector((state) => state.workouts);
  const userData = useSelector((state) => state.userData);

  const [templateName, setWorkoutName] = useState("");
  const templates = useMemo(() => {
    return workoutsState.workouts
      .map((w, i) => ({ workout: w, index: i }))
      .filter((w) => w.workout.is_template);
  }, [workoutsState]);

  const createTemplate = async () => {
    const exists = templates.find((w) => w.workout.tag == templateName);
    if (exists) return;

    try {
      const body = {
        id: null,
        is_template: true,
        tag: templateName,
        exercises: [],
      };
      const json = await request("POST", "/workout", body, userData.jwt);
      dispatch(workoutActions.addWorkout({ value: json.workout }));
    } catch (err) {
      console.log("ERROR!", err.message);
    }
  };

  return (
    <WorkoutStateSync>
      <ScrollContainer>
        <View className="flex-row mb-5">
          <TextInput
            value={templateName}
            placeholder="Template name"
            className="bg-white p-3 grow outline-none placeholder-gray-500"
            onChangeText={(value) => setWorkoutName(value)}
          />
          <Pressable
            disabled={templateName.trim().length == 0}
            onPress={() => createTemplate()}
            className="flex-row gap-1 bg-blue-500 p-2 items-center"
          >
            <Feather name="plus" color="white" size={20} />
            <Text className="text-white"> New template </Text>
          </Pressable>
        </View>

        {templates.length == 0 && <Empty messages={["You have no workout templates"]} />}

        <FlatList
          data={templates}
          className="w-[100%]"
          keyExtractor={(item) => item.index}
          renderItem={({ item }) => (
            <WorkoutTemplateMemo workout={item.workout} index={item.index} />
          )}
        />
      </ScrollContainer>
    </WorkoutStateSync>
  );
}
