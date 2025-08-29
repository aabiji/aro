import { useState } from "react";
import { WorkoutInfo, useStore } from "@/lib/state";
import { request } from "@/lib/utils";

import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { WorkoutTemplateMemo } from "@/components/workouts";
import { Container, Empty, Card } from "@/components/container";
import Feather from "@expo/vector-icons/Feather";

export default function TemplatesPage() {
  const store = useStore();
  const [templateName, setWorkoutName] = useState("");

  const createTemplate = async () => {
    try {
      const data = { isTemplate: true, tag: templateName, exercises: [] };
      const json = await request("POST", "/auth/workout", { workouts: [data] }, store.jwt);
      store.upsertWorkout(json.workouts[0]);
    } catch (err: any) {
      console.log("ERROR!", err.message);
    }
  };

  const fetchMore = async () => {
    if (!store.moreTemplates) return;
    try {
      const payload = { page: store.templatesPage, includeTemplates: true };
      const json = await request("POST", "/auth/userInfo", payload, store.jwt);
      for (const w of json.user.workouts) store.upsertWorkout(w, true);
      store.updateUserData({
        moreTemplates: json.moreTemplates,
        templatesPage: store.templatesPage + 1,
      });
    } catch (err: any) {
      console.log("ERROR!", err);
    }
  };

  return (
    <Container syncState>
      <Card className="flex-row mb-5">
        <TextInput
          value={templateName} placeholder="Template name"
          className="bg-default-background p-3 grow outline-none border border-neutral-200 placeholder-neutral-500"
          onChangeText={(value: string) => setWorkoutName(value)} />
        <Pressable
          disabled={templateName.trim().length === 0} onPress={() => createTemplate()}
          className="flex-row gap-1 bg-primary-500 p-2 items-center">
          <Feather name="plus" color="white" size={20} />
          <Text className="text-default-background"> New template </Text>
        </Pressable>
      </Card>

      {!Object.values(store.workouts).some((w: WorkoutInfo) => w.isTemplate) && (
        <Empty messages={["You have no workout templates"]} />
      )}

      <FlatList
        data={Object.values(store.workouts).filter((w: WorkoutInfo) => w.isTemplate)}
        keyExtractor={(w: WorkoutInfo) => String(w.id)}
        className="w-[100%]" onEndReached={fetchMore}
        renderItem={({ item }) => <WorkoutTemplateMemo workout={item} />} />
    </Container>
  );
}
