import React, { useCallback, useRef } from "react";
import { useFocusEffect } from "expo-router";
import { useStore } from "@/lib/state";
import { request } from "@/lib/utils";

import {
  AppState, NativeEventSubscription, Platform, View, useWindowDimensions
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

export function Card({ children, className }:
  { children: React.ReactNode; className?: string }) {
  const { width } = useWindowDimensions();
  const style = `mx-auto p-2 bg-surface-color mb-5 ${className ?? ""} rounded-xl`;

  return (
    <View style={{ width: width < 400 ? "92%" : "50%" }} className={style}>
      {children}
    </View>
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
      <View style={{ width, height }} className="bg-background-color">
        {children}
      </View>
    </SafeAreaView>
  );
}
