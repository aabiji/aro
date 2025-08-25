import { useCallback, useRef } from "react";
import { useFocusEffect } from "expo-router";
import { useStore } from "@/lib/state";
import { request } from "@/lib/utils";

import React from "react";
import {
  AppState, NativeEventSubscription, Platform,
  useWindowDimensions, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import DumbellsIcon from "@/assets/dumbells.svg";

export function Section({ children }: { children: React.ReactNode} ) {
  return (
    <View className="w-[100%] m-auto border border-gray-200 p-2 bg-white mb-5">
      {children}
    </View>
  );
}

export function Empty({ messages }: { messages: string[] }) {
  return (
    <View className="items-center">
      <DumbellsIcon width={125} height={125} />
      {messages.map((_, i) => (
        <Text className="text-xl text-gray-500" key={i}>
          {messages[i]}
        </Text>
      ))}
    </View>
  );
}

export function ScrollContainer(
  { children, syncState }: { children: React.ReactNode, syncState?: boolean }) {
  const syncUserData = async () => {
    const {
      jwt, useImperial, settingsChanged, workouts, tags, taggedDates,
      changedWorkoutIds, changedTagIds, changedTaggedDates,
      removeWorkout, upsertWorkout, clearChangeSets,
    } = useStore.getState();

    try {
      // update the workouts
      if (changedWorkoutIds.size > 0) {
        const changed1 = [...changedWorkoutIds].filter(id => workouts[id] !== undefined);
        const payload1 = { workouts: changed1.map(id => workouts[id]) };
        await request("DELETE", "/auth/workout", { ids: changed1 }, jwt);

        const json1 = await request("POST", "/auth/workout", payload1, jwt);
        for (const w of json1.workouts) upsertWorkout(w, false);
        for (const id of changed1) removeWorkout(id);
      }

      // update the tags
      if (changedTagIds.size > 0) {
        const changed2 = [...changedTagIds].filter(id => tags[id] !== undefined);
        const payload2 = { tags: changed2.map(id => tags[id]) };
        await request("POST", "/auth/tag", payload2, jwt);
      }

      // update the tagged dates
      if (changedTaggedDates.size > 0) {
        const dates = [...changedTaggedDates].filter(date => taggedDates[date] !== undefined);
        const data = dates.reduce((acc, date) => {
          acc[date] = taggedDates[date];
          return acc;
        }, {} as Record<string, number[]>);
        await request("POST", "/auth/taggedDates", {taggedDates: data}, jwt);
      }

      // update user settings
      if (settingsChanged)
        await request("POST", "/auth/user", { useImperial }, jwt);
      clearChangeSets();
    } catch (error: any) {
      console.log("ERROR!", error.message);
    }
  }

  const appState = useRef(AppState.currentState);
  let subscription: NativeEventSubscription;
  const handleHidden = () => { if (document.hidden) syncUserData(); };
  const handleClose = () => syncUserData();

  // sync when the app is closed or in the background
  useFocusEffect(
    useCallback(() => {
      if (!syncState) return () => {};

      if (Platform.OS !== "web") {
        subscription = AppState.addEventListener("change", (nextAppState) => {
          if (appState.current === "active" && nextAppState.match(/inactive|background/))
            syncUserData(); // app has gone to the background
          appState.current = nextAppState;
        });
      } else {
        document.addEventListener("beforeunload", handleClose);
        document.addEventListener("visibilitychange", handleHidden);
      }

      return () => {
        if (Platform.OS !== "web") {
          subscription.remove();
        } else {
          document.removeEventListener("beforeunload", handleClose);
          document.removeEventListener("visibilitychange", handleHidden);
        }
      };
    }, []),
  );

  const { width } = useWindowDimensions();
  const containerWidth = width > 1024 ? "40%" : "60%";

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View className="m-auto h-[100%] mt-5" style={{ width: containerWidth }}>
        {children}
      </View>
    </SafeAreaView>
  );
}
