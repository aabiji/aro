import { useDispatch, useSelector } from "react-redux";
import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { request } from "@/lib/http";
import { workoutActions } from "@/lib/state";

import { AppState, NativeEventSubscription, Platform } from "react-native";

export default function WorkoutStateSync({ children }) {
  const opts = { year: 'numeric', month: 'long', day: 'numeric' };
  const today = new Intl.DateTimeFormat('en-US', opts).format(new Date());
  const [alradySynching, setAlreadySynching] = useState(false);

  const dispatch = useDispatch();
  const workoutsState = useSelector(state => state.workouts);
  const userData = useSelector(state => state.userData);

  const syncWorkouts = async () => {
    if (alradySynching) return;
    setAlreadySynching(true);

    for (let i = 0; i < workoutsState.workouts.length; i++) {
      const workout = workoutsState.workouts[i];
      if (workout.tag != today && !workout.is_template) continue; // ignore archived workouts

      try {
        const json = await request("PUT", "/workout", workout, userData.jwt);
        dispatch(workoutActions.updateWorkout({ workoutIndex: i, value: json.workout }));
        console.log();
      } catch (err) {
        console.log("ERROR!", err.message);
      }
    }

    setAlreadySynching(false);
  }

  const appState = useRef(AppState.currentState);
  let subscription: NativeEventSubscription;
  const handleHidden = () => { if (document.hidden) syncWorkouts(); };
  const handleClose = () => syncWorkouts();

  // sync when the app is closed or in the background
  useFocusEffect(useCallback(() => {
    if (Platform.OS !== "web") {
      subscription = AppState.addEventListener("change", (nextAppState) => {
        if (appState.current === "active" && nextAppState.match(/inactive|background/))
          syncWorkouts(); // app has gone to the background
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
  }, []));

  return children;
}
