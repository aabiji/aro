import { combineReducers, createSlice, PayloadAction } from "@reduxjs/toolkit";

export enum ExerciseType { Resistance, Cardio };

// NOTE: see the corresponding backend api request types
export interface ExerciseInfo {
  id: number | null;
  exercise_type: ExerciseType;
  name: string;
  weight: number | null;
  reps: number[] | null;
  duration: number | null;
  distance: number | null;
}

export interface WorkoutInfo {
  id: number | null;
  is_template: boolean;
  exercises: ExerciseInfo[];
  tag: string;
}

interface Action<T> {
  workoutIndex?: number;
  exerciseIndex?: number;
  value: T;
}

const workoutsSlice = createSlice({
  name: "workout",
  initialState: { workouts: [] as WorkoutInfo[] },
  reducers: {
    clear: (state) => { state.workouts = []; },
    set: (state, a: PayloadAction<WorkoutInfo[]>) => { state.workouts = a.payload },

    setTemplateName: (state, a: PayloadAction<Action<string>>) => {
      state.workouts[a.payload.workoutIndex!].tag = a.payload.value;
    },

    addWorkout: (state, a: PayloadAction<Action<WorkoutInfo>>) => {
      state.workouts.push(a.payload.value);
    },

    removeWorkout: (state, a: PayloadAction<Action<null>>) => {
      state.workouts.splice(a.payload.workoutIndex!, 1);
    },

    updateWorkout: (state, a: PayloadAction<Action<WorkoutInfo>>) => {
      state.workouts[a.payload.workoutIndex!] = a.payload.value;
    },

    addExercise: (state, a: PayloadAction<Action<ExerciseInfo>>) => {
      // default to null instead of undefined so that the object's schea is valid
      const nullableExerciseFields = ["id", "weight", "reps", "duration", "distance"];
      let exercise = a.payload.value;
      for (const field of nullableExerciseFields) {
        if (exercise[field] === undefined) exercise[field] = null;
      }
      state.workouts[a.payload.workoutIndex!].exercises.push(exercise);
    },

    removeExercise: (state, a: PayloadAction<Action<null>>) => {
      state.workouts[a.payload.workoutIndex!].exercises.splice(a.payload.exerciseIndex!, 1);
    },

    updateExercise: (state, a: PayloadAction<Action<object>>) => {
      Object.assign(
        state.workouts[a.payload.workoutIndex!].exercises[a.payload.exerciseIndex!],
        a.payload.value,
      );
    }
  }
});

const userData = createSlice({
  name: "user-data",
  initialState: {
    jwt: "",
    use_imperial: true,
  },
  reducers: {
    update: (state, a: PayloadAction<object>) => { Object.assign(state, a.payload); },
    clear: (state) => { state.jwt = ""; state.use_imperial = true; },
  }
});

const eventsData = createSlice({
  name: "events",
  initialState: {

  },
  reducers: {

  }
});

export const workoutActions = workoutsSlice.actions;
export const userDataActions = userData.actions;
export const eventsActions = userData.actions;

export const rootReducer = combineReducers({
  workouts: workoutsSlice.reducer,
  userData: userData.reducer,
  events: eventsData.reducer,
});
