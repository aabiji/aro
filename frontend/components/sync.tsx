import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useStore } from "@/lib/state";
import { formatDate, request } from "@/lib/utils";

import { AppState, NativeEventSubscription, Platform } from "react-native";

// unified way to synchronize the updates (creation/deletion a non problem)
// of user settings, workouts, tags and tagged dates
//
// have a set of ids; Set<number>
// when updating, add the id the object into the set,
// then iterate over the ids in the set, and sync with backend
// actually....just use redux's createEntityAdapter!

export default function StateSync({ children }) {
  /*
  const today = formatDate(new Date());
  const [alradySynching, setAlreadySynching] = useState(false);

  const dispatch = useDispatch();
  const workoutsState = useSelector((state) => state.workouts);
  const userData = useSelector((state) => state.userData);

  const syncWorkouts = async () => {
    if (alradySynching) return;
    setAlreadySynching(true);

    for (let i = 0; i < workoutsState.workouts.length; i++) {
      const workout = workoutsState.workouts[i];
      if (workout.tag != today && !workout.isTemplate) continue; // ignore archived workouts

      try {
        // update = delete the existing one then create a new one
        await request("DELETE", `/auth/workout/${workout.id}`, undefined, userData.jwt);
        const json = await request("POST", "/auth/workout", workout, userData.jwt);
        dispatch(
          workoutActions.updateWorkout({
            workoutIndex: i,
            value: json.workout,
          }),
        );
      } catch (err) {
        console.log("ERROR!", err.message);
      }
    }

    setAlreadySynching(false);
  };

  const appState = useRef(AppState.currentState);
  let subscription: NativeEventSubscription;
  const handleHidden = () => {
    if (document.hidden) syncWorkouts();
  };
  const handleClose = () => syncWorkouts();

  // sync when the app is closed or in the background
  useFocusEffect(
    useCallback(() => {
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
    }, []),
  );
  */
  return children;
}
