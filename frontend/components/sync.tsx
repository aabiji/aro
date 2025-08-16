import { useDispatch, useSelector } from "react-redux";
import { useEffect, useRef, useState } from "react";
import { request } from "@/lib/http";
import { workoutActions } from "@/lib/state";

import { AppState, NativeEventSubscription, Platform } from "react-native";

export default function WorkoutStateSync({ children }) {
  const dispatch = useDispatch();
  const workoutsState = useSelector(state => state.workouts);
  const userData = useSelector(state => state.userData);
  const [alradySynching, setAlreadySynching] = useState(false);

  const syncWorkouts = async () => {
    if (alradySynching) return;
    setAlreadySynching(true);

    for (let i = 0; i < workoutsState.workouts.length; i++) {
      const workout = workoutsState.workouts[i];
      try {
        const json = await request("PUT", "/workout", workout, userData.jwt);
        dispatch(workoutActions.updateWorkout({ workoutIndex: i, value: json.workout }));
      } catch (err) {
        console.log("ERROR!", err.message);
      }
    }

    setAlreadySynching(false);
  }

  setInterval(() => syncWorkouts(), 1000 * 60 * 5); // sync every 5 minutes

  const appState = useRef(AppState.currentState);
  let subscription: NativeEventSubscription;
  const handleHidden = () => { if (document.hidden) syncWorkouts(); };
  const handleClose = () => syncWorkouts();

  // sync when the app is closed or in the background
  // FIXME: are we running every single keystroke?
  // FIXME: the updating is fucked
  useEffect(() => {
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
  }, []);

  return children;
}
