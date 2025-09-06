import { useState } from "react";
import { WorkoutInfo, useStore } from "@/lib/state";
import { request } from "@/lib/utils";

import { FlatList, Text, View } from "react-native";
import { WorkoutTemplateMemo } from "@/components/workouts";
import { Container, Input, Button } from "@/components/elements";
import { BackHeader } from "@/components/header";

export default function TemplatesPage() {
  const store = useStore();
  const [templateName, setTemplateName] = useState("");

  const createTemplate = async () => {
    try {
      const data = { isTemplate: true, tag: templateName, exercises: [] };
      const json = await request("POST", "/auth/workout", data, store.jwt);
      store.upsertWorkout(json.workout);
      setTemplateName("");
    } catch (err: any) {
      console.log("ERROR!", err.message);
    }
  };

  const fetchMore = async () => {
    if (!store.moreTemplates) return;
    try {
      const payload = { page: store.templatesPage, includeTemplates: true };
      const json = await request("POST", "/auth/user", payload, store.jwt);
      for (const w of json.user.workouts) store.upsertWorkout(w);
      store.updateUserData({
        moreTemplates: json.moreTemplates,
        templatesPage: store.templatesPage + 1,
      });
    } catch (err: any) {
      console.log("ERROR!", err);
    }
  };

  return (
    <Container>
      <BackHeader title={"Workout templates"} />

      <View className="flex-row w-[90%] mx-auto mb-2">
        <Input
          className="w-[90%] bg-surface-color"
          text={templateName} setText={setTemplateName}
          placeholder="New template name" />
        <Button
          icon="add"
          disabled={templateName.trim().length === 0}
          onPress={createTemplate} />
      </View>

      {!Object.values(store.workouts).some((w: WorkoutInfo) => w.isTemplate) && (
        <Text className="text-center text-sm text-grey-400">No workout templates</Text>
      )}

      <FlatList
        data={Object.values(store.workouts).filter((w: WorkoutInfo) => w.isTemplate)}
        keyExtractor={(w: WorkoutInfo) => String(w.id)}
        className="w-[100%]" onEndReached={fetchMore}
        renderItem={({ item }) => <WorkoutTemplateMemo workout={item} />} />
    </Container>
  );
}
