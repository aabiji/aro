import React, { useCallback, useRef } from "react";
import { useFocusEffect } from "expo-router";
import { useStore } from "@/lib/state";
import { request } from "@/lib/utils";

import {
  AppState, Modal, NativeEventSubscription, Platform,
  Pressable, View, useWindowDimensions
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

export function Card({ children, className, border }:
  { children: React.ReactNode; className?: string; border?: boolean; }) {
  const { width } = useWindowDimensions();
  const style = `
    mx-auto ${border ? "border border-neutral-200" : ""}
    p-2 bg-default-background mb-5 ${className ?? ""}
  `;

  return (
    <View style={{ width: width < 400 ? "92%" : "50%" }} className={style}>
      {children}
    </View>
  );
}

export function Popup({ visible, close, children }:
  { visible: boolean, close: () => void; children: React.ReactNode }) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={close}>
      <Pressable onPress={close} className="flex-1"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.3)", cursor: "default" }}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full h-[50%] absolute bottom-0 bg-neutral-50 shadow-md py-2 cursor-default">
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function Container({ children, syncState }:
  { children: React.ReactNode; syncState?: boolean; }) {
  const appState = useRef(AppState.currentState);
  const { width, height } = useWindowDimensions();

  const syncUserData = async () => {
    const store = useStore.getState();

    try {
      // update the workouts
      if (store.changedWorkoutIds.size > 0) {
        const changed1 = [...store.changedWorkoutIds].filter((id) => store.workouts[id] !== undefined);
        const payload1 = { workouts: changed1.map((id) => store.workouts[id]) };
        await request("DELETE", "/auth/workout", { ids: changed1 }, store.jwt);

        const json1 = await request("POST", "/auth/workout", payload1, store.jwt);
        for (const w of json1.workouts) store.upsertWorkout(w, false);
        for (const id of changed1) store.removeWorkout(id);
      }

      // update the tags
      if (store.changedTagIds.size > 0) {
        const changed2 = [...store.changedTagIds].filter((id) => store.tags[id] !== undefined);
        const payload2 = { tags: changed2.map((id) => store.tags[id]) };
        await request("POST", "/auth/tag", payload2, store.jwt);
      }

      // update the tagged dates
      if (store.changedTaggedDates.size > 0) {
        const dates = [...store.changedTaggedDates].filter((date) => store.taggedDates[date] !== undefined);
        const data = dates.reduce(
          (acc, date) => {
            acc[date] = store.taggedDates[date];
            return acc;
          }, {} as Record<string, number[]>);
        await request("POST", "/auth/taggedDates", { taggedDates: data }, store.jwt);
      }

      // update user settings
      if (store.settingsChanged)
        await request("POST", "/auth/user", { useImperial: store.useImperial }, store.jwt);
      store.clearChangeSets();
    } catch (error: any) {
      console.log("ERROR!", error.message);
    }
  };

  // sync when the app is closed or in the background
  useFocusEffect(
    useCallback(() => {
      if (!syncState) return () => { };

      const handleHidden = () => { if (document.hidden) syncUserData(); };
      const handleClose = () => syncUserData();

      let subscription: NativeEventSubscription;
      if (Platform.OS !== "web") {
        subscription = AppState.addEventListener("change", (nextAppState) => {
          if (
            appState.current === "active" &&
            nextAppState.match(/inactive|background/)
          )
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
    }, [syncState]),
  );

  return (
    <SafeAreaView style={{ height, flex: 1 }} edges={["top", "bottom", "left", "right"]}>
      <View style={{ width, height }} className="bg-default-background">
        {children}
      </View>
    </SafeAreaView>
  );
}
