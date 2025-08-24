import { useState } from "react";
import { Workout, useStore } from "@/lib/state";
import { request } from "@/lib/utils";

import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import StateSync from "@/components/sync";
import { WorkoutTemplateMemo } from "@/components/workouts";
import { ScrollContainer, Empty } from "@/components/container";
import Feather from "@expo/vector-icons/Feather";

export default function TemplatesPage() {
  const { upsertWorkout, jwt, workouts } = useStore();

  const [templateName, setWorkoutName] = useState("");

  const createTemplate = async () => {
    if (workouts[templateName] !== undefined) return;

    try {
      const body = {
        is_template: true,
        tag: templateName,
        exercises: [],
      };
      const json = await request("POST", "/auth/workout", body, jwt);
      upsertWorkout(json.workout);
    } catch (err: any) {
      console.log("ERROR!", err.message);
    }
  };

  return (
    <StateSync>
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

        {Object.values(workouts).some((w: Workout) => w.isTemplate) &&
          <Empty messages={["You have no workout templates"]} />}

        <FlatList
          data={Object.values(workouts).filter((w: Workout) => w.isTemplate)}
          className="w-[100%]"
          keyExtractor={(w: Workout) => w.id}
          renderItem={({ item }) => <WorkoutTemplateMemo workout={item} />}
        />
      </ScrollContainer>
    </StateSync>
  );
}
